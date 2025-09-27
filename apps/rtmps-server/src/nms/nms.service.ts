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

    const config = {
      rtmp: { port: 1935, chunk_size: 60000, gop_cache: true, ping: 30, ping_timeout: 60 },
      http: { port: 8000, mediaroot: mediaRoot, allow_origin: '*' },
  fission: {
        ffmpeg: ffmpegPath,
        tasks: [
          {
            rule: 'live/*',
            // This model tells FFmpeg to copy the video and audio streams
            // without re-encoding, and save it as an .flv file.
            model: [
              {
                ab: '128k', // Audio bitrate (required by the type, but ignored by -c:a copy)
                vb: '2000k', // Video bitrate (required by the type, but ignored by -c:v copy)
                vs: '1280x720', // Video size (required by the type)
                vf: '30',      // Video framerate (required by the type)
                // The actual command to execute:
                cmd: 'ffmpeg',
                args: ['-i', '-', '-c:v', 'copy', '-c:a', 'copy', '-f', 'flv', '{path}'],
              },
            ],
          },
        ],
      },
      auth: { api: true, api_user: 'admin', api_pass: 'admin' },
    };

    this.nms = new NodeMediaServer(config);
    this.setupStreamEvents(mediaRoot);
    this.nms.run();
  }

  private setupStreamEvents(mediaRoot: string) {
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
      if (!streamKey) return;

      this.logger.log(`[NMS] Stream ended: ${streamKey}. Triggering VOD processing.`);
      await this.streamService.updateStreamStatus(streamKey, false);

      const rawFilePath = path.join(mediaRoot, 'live', `${streamKey}.flv`);

      if (fs.existsSync(rawFilePath)) {
        await this.videoQueue.add('transcode-hls', { filePath: rawFilePath, streamKey: streamKey });
        this.logger.log(`[QUEUE] Added job for stream key: ${streamKey}`);
      } else {
        this.logger.error(`[NMS] Raw stream file not found for ${streamKey} at ${rawFilePath}`);
      }
    });
  }
}