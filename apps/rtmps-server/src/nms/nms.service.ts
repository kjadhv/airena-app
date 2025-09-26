import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import NodeMediaServer from 'node-media-server';
import { ConfigService } from '@nestjs/config';
import { StreamService } from '../stream/stream.service';
import * as fs from 'fs';
import * as path from 'path'; // <-- 1. Import the 'path' module

@Injectable()
export class NmsService implements OnModuleInit {
  private nms!: NodeMediaServer;
  private readonly logger = new Logger(NmsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly streamService: StreamService,
  ) {}

  onModuleInit() {
    const ffmpegPath = this.configService.get<string>('FFMPEG_PATH');
    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
      this.logger.error(`❌ FFmpeg binary not found at path specified in .env: ${ffmpegPath}`);
      process.exit(1);
    }
    
    // 2. Define the absolute path to the media directory
    const mediaRoot = path.join(__dirname, '..', '..', 'media');
    
    // 3. Ensure the directory exists
    if (!fs.existsSync(mediaRoot)) {
      fs.mkdirSync(mediaRoot, { recursive: true });
    }

    const config = {
      rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60,
      },
      http: {
        port: 8000,
        mediaroot: "C:/Users/kumar/OneDrive/Desktop/airena/apps/rtmps-server/media",// <-- 4. Use the absolute path here
        allow_origin: '*',
      },
      trans: {
        ffmpeg: ffmpegPath,
        tasks: [
          {
            app: 'live',
            hls: true,
            hlsFlags: '[hls_time=1:hls_list_size=3:hls_flags=delete_segments]',
            dash: true,
          },
        ],
      },
      auth: {
        api: true,
        api_user: 'admin',
        api_pass: 'admin',
      },
    };

    this.nms = new NodeMediaServer(config);
    this.setupStreamEvents();
    this.nms.run();
  }

  // ... (the rest of the file is the same)
  private setupStreamEvents() {
    this.nms.on('prePublish', async (id, StreamPath, args) => {
      const streamKey = StreamPath.split('/').pop();
      const session = this.nms.getSession(id);

      if (!streamKey) {
        this.logger.warn(`[AUTH] REJECTED stream with invalid path: ${StreamPath}`);
        return (session as any).reject();
      }

      const stream = await this.streamService.getStreamByKey(streamKey);

      if (!stream) {
        this.logger.warn(`[AUTH] REJECTED stream key: ${streamKey}. Key not found.`);
        (session as any).reject();
      } else {
        this.logger.log(`[AUTH] ACCEPTED stream key: ${streamKey}.`);
        await this.streamService.updateStreamStatus(streamKey, true);
      }
    });

    this.nms.on('donePublish', async (id, StreamPath, args) => {
      const streamKey = StreamPath.split('/').pop();
      if (streamKey) {
        this.logger.log(`[NMS] Stream ended: ${streamKey}`);
        await this.streamService.updateStreamStatus(streamKey, false);
      }
    });
  }
}