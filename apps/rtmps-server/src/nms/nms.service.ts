import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, forwardRef } from '@nestjs/common';
import NodeMediaServer from 'node-media-server';
import { MetricService } from '../metrics/metric.service';
import { StreamService } from '../stream/stream.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class NmsService implements OnModuleInit, OnModuleDestroy {
  private nms!: NodeMediaServer;
  private readonly logger = new Logger(NmsService.name);
  private nmsConfig: any;
  private readonly mediaRoot: string;

  constructor(
    private readonly metricService: MetricService,
    @Inject(forwardRef(() => StreamService))
    private readonly streamService: StreamService,
    private readonly configService: ConfigService,
  ) {
    this.mediaRoot = this.configService.get<string>('MEDIA_ROOT') || path.join(process.cwd(), 'media');
    this.logger.log(`NmsService using media root: ${this.mediaRoot}`);
  }

  onModuleInit() {
    const isWindows = process.platform === 'win32';
    const defaultFfmpegPath = isWindows ? 'C:/ffmpeg/bin/ffmpeg.exe' : '/usr/bin/ffmpeg';
    const ffmpegPath = this.configService.get<string>('FFMPEG_PATH', defaultFfmpegPath);

    if (!fs.existsSync(ffmpegPath)) {
      this.logger.error(`FFmpeg binary not found at: ${ffmpegPath}`);
      this.logger.error('Please install FFmpeg or set the FFMPEG_PATH in your .env.local file.');
      this.logger.error('Windows: Download from https://ffmpeg.org/download.html');
      this.logger.error('Linux/Mac: Use package manager (apt install ffmpeg, brew install ffmpeg)');
      process.exit(1);
    }

    this.logger.log(`Media root resolved to: ${this.mediaRoot}`);
    
    if (!fs.existsSync(this.mediaRoot)) {
      try {
        fs.mkdirSync(this.mediaRoot, { recursive: true });
        this.logger.log(`Created media root directory: ${this.mediaRoot}`);
      } catch (error) {
        this.logger.error(`Failed to create media root directory: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    }

    const liveDir = path.join(this.mediaRoot, 'live');
    if (!fs.existsSync(liveDir)) {
      try {
        fs.mkdirSync(liveDir, { recursive: true });
        this.logger.log(`Created live directory: ${liveDir}`);
      } catch (error) {
        this.logger.error(`Failed to create live directory: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    this.nmsConfig = {
      rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60,
      },
      http: {
        port: 8080,
        mediaroot: this.mediaRoot,
        allow_origin: '*',
        api: true,
      },
      trans: {
        ffmpeg: ffmpegPath,
        tasks: [
          {
            app: 'live',
            hls: true,
            // FIX: Simplified the HLS flags to be more compatible.
            hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
            mp4: true,
            mp4Flags: '[movflags=frag_keyframe+empty_moov]',
          },
        ],
      },
      logType: 3,
    };

    this.nms = new NodeMediaServer(this.nmsConfig);
    this.setupStreamEvents();
    this.nms.run();

    this.logger.log(`NodeMediaServer started successfully!`);
    this.logger.log(`  RTMP Server: rtmp://localhost:1935`);
    this.logger.log(`  HTTP Server: http://localhost:8080 (NodeMediaServer internal)`);
    this.logger.log(`  Media Root: ${this.mediaRoot}`);
    this.logger.log(`  HLS Playback: Via NestJS app on port 8000`);
  }

  private setupStreamEvents() {
    this.nms.on('preConnect', (id, args) => this.logger.debug(`Client connecting with session info`));
    this.nms.on('doneConnect', (id, args) => this.logger.debug(`Client connected successfully`));

    this.nms.on('prePublish', (id, streamPath, args) => {
      const streamKey = this.extractStreamKeyFromEvent(id, streamPath, args);
      if (streamKey) {
        this.logger.log(`Stream starting: ${streamKey}`);
        this.streamService.startStream(streamKey).catch(err => {
          this.logger.warn(`Failed to mark stream as started in database: ${err instanceof Error ? err.message : String(err)}`);
        });
      } else {
        this.logger.warn('Could not extract stream key from prePublish event');
        this.logEventDetails('prePublish', id, streamPath, args);
      }
    });

    this.nms.on('postPublish', (id, streamPath, args) => {
      const streamKey = this.extractStreamKeyFromEvent(id, streamPath, args);
      if (streamKey) this.logger.log(`Stream is now live: ${streamKey}`);
    });

    this.nms.on('donePublish', (id, streamPath, args) => {
      (async () => {
        const streamKey = this.extractStreamKeyFromEvent(id, streamPath, args);
        if (!streamKey) {
          this.logger.warn('Could not extract stream key from donePublish event');
          this.logEventDetails('donePublish', id, streamPath, args);
          return;
        }
        this.logger.log(`Stream ended: ${streamKey}`);
        try {
          await this.streamService.stopStream(streamKey);
          this.logger.log(`Stream ${streamKey} marked as stopped in database`);
        } catch (err) {
          this.logger.warn(`Failed to mark stream as stopped: ${err instanceof Error ? err.message : String(err)}`);
        }
        this.handleStreamRecording(streamKey);
      })();
    });

    this.nms.on('prePlay', (id, streamPath, args) => {
      const streamKey = this.extractStreamKeyFromEvent(id, streamPath, args);
      if (streamKey) this.logger.debug(`Client starting playback: ${streamKey}`);
    });

    this.nms.on('donePlay', (id, streamPath, args) => {
      const streamKey = this.extractStreamKeyFromEvent(id, streamPath, args);
      if (streamKey) this.logger.debug(`Client stopped playback: ${streamKey}`);
    });
  }

  private extractStreamKeyFromEvent(id: any, streamPath: any, args: any): string | null {
    this.logger.debug(`Extracting stream key from event - id: ${typeof id}, streamPath: ${typeof streamPath}, args: ${typeof args}`);
    let actualStreamPath: string | null = null;
    if (typeof streamPath === 'string') actualStreamPath = streamPath;
    else if (typeof id === 'string' && id.includes('/live/')) actualStreamPath = id;
    else if (id && typeof id === 'object' && id.streamPath) actualStreamPath = id.streamPath;
    
    if (actualStreamPath) {
      const matches = actualStreamPath.match(/\/live\/([^\/\?]+)/);
      if (matches && matches[1]) {
        const streamKey = matches[1];
        this.logger.debug(`Extracted stream key: ${streamKey} from path: ${actualStreamPath}`);
        return streamKey;
      }
    }
    this.logger.debug(`Could not extract stream key from event data`);
    return null;
  }

  private logEventDetails(eventType: string, id: any, streamPath: any, args: any) {
    this.logger.debug(`${eventType} event details: id type: ${typeof id}, streamPath type: ${typeof streamPath}, args type: ${typeof args}`);
    if (typeof id === 'string') this.logger.debug(`  id value: ${id}`);
    if (typeof streamPath === 'string') this.logger.debug(`  streamPath value: ${streamPath}`);
  }

  private async handleStreamRecording(streamKey: string) {
    setTimeout(async () => {
      const videoPath = path.join(this.mediaRoot, 'live', streamKey, 'index.mp4');
      if (fs.existsSync(videoPath)) {
        try {
          const stats = fs.statSync(videoPath);
          const sizeMB = Math.round(stats.size / 1024 / 1024);
          if (stats.size > 0) {
            this.logger.log(`Found recording: ${videoPath} (${sizeMB}MB)`);
            await this.streamService.saveFinishedStream(streamKey, videoPath);
            this.logger.log(`Successfully processed recording for ${streamKey}`);
          } else {
            this.logger.warn(`Recording file is empty: ${videoPath}`);
            fs.unlinkSync(videoPath);
          }
        } catch (err) {
          this.logger.error(`Failed to save stream ${streamKey}: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        this.logger.warn(`No recording found at: ${videoPath}`);
        this.logger.warn('This may be normal if the stream was very short or FFmpeg failed to create the file');
      }
    }, 5000);
  }

  getMediaRoot(): string {
    return this.mediaRoot;
  }

  getNodeMediaServer(): NodeMediaServer {
    return this.nms;
  }

  async onModuleDestroy() {
    if (this.nms) {
      try {
        this.nms.stop();
        this.logger.log('NodeMediaServer stopped gracefully');
      } catch (error) {
        this.logger.error(`Error stopping NodeMediaServer: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}