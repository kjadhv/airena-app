import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import NodeMediaServer from 'node-media-server';
import { StreamService } from '../stream/stream.service';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class NmsService implements OnModuleInit {
  private nms!: NodeMediaServer;
  private readonly logger = new Logger(NmsService.name);
  private readonly API_HOOK_URL: string;
  private readonly MEDIA_ROOT: string;

  constructor(
    @InjectQueue('video-processing') private readonly videoQueue: Queue,
    private readonly configService: ConfigService,
    private readonly streamService: StreamService,
    private readonly httpService: HttpService,
  ) {
    const apiUrl = this.configService.get<string>('API_URL');
    if (!apiUrl) {
      throw new Error('FATAL: API_URL environment variable is not set for the NMS service.');
    }
    this.API_HOOK_URL = `${apiUrl}/stream/hooks/status`;
    this.MEDIA_ROOT = this.configService.get<string>('MEDIA_ROOT', path.join(__dirname, '..', '..', 'media'));
  }

  onModuleInit() {
    const ffmpegPath = this.configService.get<string>('FFMPEG_PATH');
    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
      this.logger.error(`❌ FFmpeg binary not found at path: ${ffmpegPath}`);
      process.exit(1);
    }
    
    if (!fs.existsSync(this.MEDIA_ROOT)) {
      fs.mkdirSync(this.MEDIA_ROOT, { recursive: true });
    }

    const config = {
      rtmp: { 
        port: 1935, 
        chunk_size: 60000, 
        gop_cache: true, 
        ping: 30, 
        ping_timeout: 60 
      },
      http: { 
        port: 8000, 
        mediaroot: this.MEDIA_ROOT, 
        allow_origin: '*' 
      },
      trans: {
        ffmpeg: ffmpegPath,
        tasks: [{ 
          app: 'live',
          // Enable FLV recording for VOD creation
          flv: true,
          flvFlags: '[flvflags=no_duration_filesize]',
          // Enable HLS for live playback
          hls: true, 
          // 🔥 FIX #3: Set hlsKeep to false to delete segments when stream ends
          // This prevents old stream segments from being served on reconnect
          hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
          hlsKeep: false, // Deletes HLS after stream ends (prevents old content bug)
        }]
      },
    };

    this.nms = new NodeMediaServer(config);
    this.setupStreamEvents();
    this.nms.run();
    
    this.logger.log('✅ NMS Service Initialized');
    this.logger.log(`🎬 FFmpeg Path: ${ffmpegPath}`);
    this.logger.log(`📡 Notifying Main API at: ${this.API_HOOK_URL}`);
  }

  /**
   * ✨ Notifies the main API about stream status changes via an HTTP POST request.
   */
  private async notifyApiOfStreamStatus(streamKey: string, isActive: boolean): Promise<void> {
    const status = isActive ? 'LIVE' : 'OFFLINE';
    this.logger.log(`[HOOK] Notifying API that stream '${streamKey}' is now ${status}.`);
    try {
      const payload = { streamKey, isActive };
      await firstValueFrom(
        this.httpService.post(this.API_HOOK_URL, payload, { timeout: 5000 })
      );
      this.logger.log(`[HOOK] Successfully notified API for stream '${streamKey}'.`);
    } catch (error) {
      let errorMessage = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        errorMessage =
          (error as any).response?.data?.message ||
          (error as any).message ||
          errorMessage;
      }
      this.logger.error(`[HOOK] Failed to notify API for stream '${streamKey}'. Error: ${errorMessage}`);
    }
  }

  /**
   * 🔥 FIX #3: Clean up old HLS segments before a new stream starts
   */
  private cleanupOldHlsSegments(streamKey: string): void {
    const hlsDir = path.join(this.MEDIA_ROOT, 'live', streamKey);
    
    if (fs.existsSync(hlsDir)) {
      this.logger.log(`[CLEANUP] Removing old HLS segments for stream: ${streamKey}`);
      try {
        // Remove all .ts and .m3u8 files
        const files = fs.readdirSync(hlsDir);
        files.forEach(file => {
          if (file.endsWith('.ts') || file.endsWith('.m3u8')) {
            const filePath = path.join(hlsDir, file);
            fs.unlinkSync(filePath);
          }
        });
        this.logger.log(`[CLEANUP] ✅ Cleaned up old segments for: ${streamKey}`);
      } catch (error) {
        this.logger.error(`[CLEANUP] Failed to clean directory: ${error}`);
      }
    }
  }

  /**
   * ✨ UPGRADED: Event handlers with cleanup on stream start
   */
  private setupStreamEvents() {
    this.nms.on('prePublish', async (id, StreamPath, args) => {
      const streamKey = StreamPath.split('/').pop();
      this.logger.log(`[AUTH] Attempting to publish stream with key: ${streamKey}`);

      if (!streamKey) {
        const session = this.nms.getSession(id);
        this.logger.warn('[AUTH] REJECTED: Stream path is invalid.');
        return (session as any).reject();
      }

      // 1. Authorize the stream key against the database
      const stream = await this.streamService.getStreamByKey(streamKey);
      if (!stream) {
        const session = this.nms.getSession(id);
        this.logger.warn(`[AUTH] REJECTED: Stream key '${streamKey}' not found.`);
        return (session as any).reject();
      }

      this.logger.log(`[AUTH] ✅ ACCEPTED: Stream key '${streamKey}' is valid.`);
      
      // 🔥 FIX #3: Clean up any old HLS segments from previous streams
      this.cleanupOldHlsSegments(streamKey);
      
      // 2. Notify the API that the stream is starting
      this.notifyApiOfStreamStatus(streamKey, true);
    });

    this.nms.on('donePublish', async (id, StreamPath, args) => {
      const streamKey = StreamPath.split('/').pop();
      this.logger.log(`[NMS] Stream ended: ${streamKey}`);

      if (streamKey) {
        // Notify API that stream is offline and queue transcoding
        this.notifyApiOfStreamStatus(streamKey, false);
        this.queueTranscodingJob(streamKey);
      }
    });
  }

  /**
   * ✨ REFINED: Encapsulated transcoding job logic
   */
  private async queueTranscodingJob(streamKey: string): Promise<void> {
    const rawFilePath = path.join(this.MEDIA_ROOT, 'live', `${streamKey}.flv`);

    if (!fs.existsSync(rawFilePath)) {
      this.logger.error(`[QUEUE] Cannot queue job. Source file not found: ${rawFilePath}`);
      return;
    }

    try {
      await this.videoQueue.add('transcode-hls', { filePath: rawFilePath, streamKey });
      this.logger.log(`[QUEUE] ✅ Successfully added transcoding job for '${streamKey}'.`);
    } catch (error) {
      const errorMsg = (error instanceof Error) ? error.message : String(error);
      this.logger.error(`[QUEUE] Failed to add transcoding job for '${streamKey}'. Error: ${errorMsg}`);
    }
  }
}