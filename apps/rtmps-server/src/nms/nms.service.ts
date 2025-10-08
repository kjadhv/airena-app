// apps/rtmps-server/src/nms/nms.service.ts

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import NodeMediaServer from 'node-media-server';
import { ConfigService } from '@nestjs/config';
import { StreamService } from '../stream/stream.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class NmsService implements OnModuleInit {
  private nms!: NodeMediaServer;
  private readonly logger = new Logger(NmsService.name);
  private streamSessions = new Map<string, string>(); // Map session ID to original stream key

  constructor(
    @InjectQueue('video-processing') private readonly videoQueue: Queue,
    private readonly configService: ConfigService,
    private readonly streamService: StreamService,
  ) {}

  onModuleInit() {
    const mediaRoot = this.configService.get<string>('MEDIA_ROOT', path.join(__dirname, '..', '..', 'media'));
    const ffmpegPath = this.configService.get<string>('FFMPEG_PATH');

    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
      this.logger.error(`❌ FFmpeg binary not found at path: ${ffmpegPath}`);
      process.exit(1);
    }
    
    if (!fs.existsSync(mediaRoot)) {
      fs.mkdirSync(mediaRoot, { recursive: true });
    }

    const liveDir = path.join(mediaRoot, 'live');
    if (!fs.existsSync(liveDir)) {
      fs.mkdirSync(liveDir, { recursive: true });
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
        mediaroot: mediaRoot, 
        allow_origin: '*' 
      },
      trans: {
        ffmpeg: ffmpegPath,
        tasks: [
          {
            app: 'live',
            hls: true,
            hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
            hlsKeep: true, // Keep segments during stream
            dash: false
          }
        ]
      },
      auth: { 
        api: true, 
        api_user: 'admin', 
        api_pass: 'admin' 
      },
    };

    this.nms = new NodeMediaServer(config);
    this.setupStreamEvents(mediaRoot);
    this.nms.run();
    
    this.logger.log(`✅ NMS initialized with HLS transcoding enabled`);
    this.logger.log(`📁 Media root: ${mediaRoot}`);
    this.logger.log(`🎬 FFmpeg path: ${ffmpegPath}`);
  }

  private extractBaseStreamKey(streamPath: string): string {
    const fullKey = streamPath.split('/').pop() || '';
    return fullKey.replace(/_\d+p?$/i, '');
  }

  private setupStreamEvents(mediaRoot: string) {
    this.nms.on('prePublish', async (id, StreamPath, args) => {
      this.logger.log(`[AUTH] Checking stream: ${StreamPath} (Session ID: ${id})`);
      
      const fullStreamKey = StreamPath.split('/').pop();
      const baseStreamKey = this.extractBaseStreamKey(StreamPath);
      
      if (!baseStreamKey) {
        this.logger.warn(`[AUTH] REJECTED stream with invalid path: ${StreamPath}`);
        const session = this.nms.getSession(id);
        return (session as any).reject();
      }

      this.streamSessions.set(id, baseStreamKey);
      
      this.logger.log(`[AUTH] Full key: ${fullStreamKey}, Base key: ${baseStreamKey}`);
      
      const stream = await this.streamService.getStreamByKey(baseStreamKey);
      if (!stream) {
        this.logger.warn(`[AUTH] REJECTED stream key: ${baseStreamKey}. Key not found in database.`);
        const session = this.nms.getSession(id);
        (session as any).reject();
      } else {
        this.logger.log(`[AUTH] ACCEPTED stream key: ${baseStreamKey}`);
        await this.streamService.updateStreamStatus(baseStreamKey, true);
      }
    });

    this.nms.on('postPublish', (id, StreamPath, args) => {
      this.logger.log(`[NMS] 🎥 Stream started: ${StreamPath} (Session ID: ${id})`);
      const streamKey = StreamPath.split('/').pop();
      this.logger.log(`[NMS] 📺 HLS stream available at: http://localhost:8000/live/${streamKey}/index.m3u8`);
    });

    this.nms.on('donePublish', async (id, StreamPath, args) => {
      this.logger.log(`[NMS] Stream ended: ${StreamPath} (Session ID: ${id})`);
      
      const baseStreamKey = this.streamSessions.get(id);
      if (!baseStreamKey) {
        this.logger.warn(`[NMS] No stream key found for session ${id}`);
        return;
      }

      this.streamSessions.delete(id);
      await this.streamService.updateStreamStatus(baseStreamKey, false);

      const fullStreamKey = StreamPath.split('/').pop();
      const possiblePaths = [
        path.join(mediaRoot, 'live', `${fullStreamKey}.flv`),
        path.join(mediaRoot, 'live', `${baseStreamKey}.flv`),
        path.join(mediaRoot, `${fullStreamKey}.flv`),
        path.join(mediaRoot, `${baseStreamKey}.flv`)
      ];

      let rawFilePath: string | null = null;
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          rawFilePath = possiblePath;
          this.logger.log(`[NMS] Found stream file at: ${rawFilePath}`);
          break;
        }
      }

      if (rawFilePath) {
        try {
          await this.videoQueue.add('transcode-hls', { 
            filePath: rawFilePath, 
            streamKey: baseStreamKey 
          });
          this.logger.log(`[QUEUE] Added transcoding job for stream key: ${baseStreamKey}`);
        } catch (error) {
          if (error instanceof Error) {
            this.logger.error(`[QUEUE] Failed to add job: ${error.message}`);
          } else {
            this.logger.error(`[QUEUE] Failed to add job with unknown error: ${error}`);
          }
        }
      } else {
        this.logger.error(`[NMS] Raw stream file not found for ${baseStreamKey}. Checked paths:`);
        possiblePaths.forEach(p => this.logger.error(`  - ${p}`));
        
        this.logger.debug('[NMS] Files in media directory:');
        try {
          const files = fs.readdirSync(mediaRoot, { recursive: true });
          files.forEach(file => this.logger.debug(`  - ${file}`));
        } catch (error) {
          if (error instanceof Error) {
            this.logger.error(`[NMS] Could not list media directory: ${error.message}`);
          } else {
            this.logger.error(`[NMS] Could not list media directory with unknown error: ${error}`);
          }
        }
      }
    });
  }
}