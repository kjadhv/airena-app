import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import NodeMediaServer from 'node-media-server';
import { MetricService } from '../metrics/metric.service';
import { StreamService } from '../stream/stream.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class NmsService implements OnModuleInit {
  private nms!: NodeMediaServer;
  private readonly logger = new Logger(NmsService.name);

  // ✅ store config ourselves to avoid TS errors
  private nmsConfig: any;

  constructor(
    private readonly metricService: MetricService,
    private readonly streamService: StreamService,
  ) {}

  onModuleInit() {
    const isWindows = process.platform === 'win32';
    const ffmpegPath = isWindows
      ? 'C:/ffmpeg/bin/ffmpeg.exe'
      : '/usr/bin/ffmpeg';

    if (!fs.existsSync(ffmpegPath)) {
      this.logger.error(`❌ FFmpeg binary not found at: ${ffmpegPath}`);
      process.exit(1);
    }

    const mediaRoot = path.resolve(__dirname, '../../media');
    if (!fs.existsSync(mediaRoot)) {
      fs.mkdirSync(mediaRoot, { recursive: true });
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
        mediaroot: mediaRoot,
        port: 8001,
        allow_origin: '*',
      },
      trans: {
        ffmpeg: ffmpegPath,
        tasks: [
          {
            app: 'live',
            hls: true,
            hlsFlags:
              '[hls_time=4:hls_list_size=10:hls_flags=delete_segments+program_date_time]',
            mp4: true,
            mp4Flags: '[movflags=frag_keyframe+empty_moov]',
          },
        ],
      },
    };

    this.nms = new NodeMediaServer(this.nmsConfig);
    this.setupStreamEvents();
    this.nms.run();

    this.logger.log(
      `NodeMediaServer started (RTMP:1935, HTTP:8000), media root: ${mediaRoot}`,
    );
  }

  private setupStreamEvents() {
    this.nms.on('donePublish', (id, streamPath: string | undefined) => {
      (async () => {
        if (!streamPath) return;
        const streamKey = streamPath.split('/').pop();
        if (!streamKey) return;

        this.logger.log(
          `🛑 [STREAM ENDED] StreamKey: ${streamKey}. Starting upload process.`,
        );

        // ✅ Use stored config instead of this.nms.config
        const mediaRoot =
          this.nmsConfig.http?.mediaroot ??
          path.resolve(__dirname, '../../media');

        const videoPath = path.join(mediaRoot, streamPath, 'index.mp4');

        if (fs.existsSync(videoPath)) {
          const saveFn = (this.streamService as any).saveFinishedStream;
          if (typeof saveFn === 'function') {
            try {
              const res = saveFn.call(this.streamService, streamKey, videoPath);
              if (res instanceof Promise) await res;
              this.logger.log(`📤 saveFinishedStream invoked for ${streamKey}`);
            } catch (err) {
              this.logger.error(
                `[donePublish] saveFinishedStream failed for ${streamKey}: ${err}`,
              );
            }
          }
        } else {
          this.logger.error(
            `[UPLOAD FAILED] Recorded file not found at: ${videoPath}`,
          );
        }
      })();
    });
  }
}
