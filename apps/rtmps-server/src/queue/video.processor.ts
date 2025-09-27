// apps/rtmps-server/src/queue/video.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

// --- These services need to be created and provided in their own modules ---
import { FirebaseService } from '../firebase/firebase.service';
import { VideoService } from '../video/video.service';

const execPromise = promisify(exec);

@Injectable()
@Processor('video-processing')
export class VideoProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoProcessor.name);

  // 1. Activated Service Injections
  constructor(
    private readonly configService: ConfigService,
    private readonly firebaseService: FirebaseService,
    private readonly videoService: VideoService,
  ) {
    super();
  }

  async process(job: Job<any>) {
    switch (job.name) {
      case 'transcode-hls':
        return this.handleTranscodeHls(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async handleTranscodeHls(job: Job<any>) {
    const { filePath, streamKey } = job.data;
    this.logger.log(`Starting HLS transcoding for stream key: ${streamKey}`);

    const mediaRoot = this.configService.get<string>('MEDIA_ROOT');
    if (!mediaRoot) {
      throw new Error('MEDIA_ROOT environment variable not set!');
    }

    const outputDir = path.join(mediaRoot, 'vod', streamKey);
    const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
    const hlsPlaylistPath = path.join(outputDir, 'playlist.m3u8');

    try {
      await fs.mkdir(outputDir, { recursive: true });

      const thumbnailCommand = `ffmpeg -i "${filePath}" -ss 00:00:01.000 -vframes 1 "${thumbnailPath}"`;
      this.logger.log(`Executing: ${thumbnailCommand}`);
      await execPromise(thumbnailCommand);

      // 2. Corrected FFmpeg Transcoding Command
      const hlsCommand = `ffmpeg -i "${filePath}" -vf "scale=-2:720" -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${outputDir}/segment%03d.ts" "${hlsPlaylistPath}"`;
      this.logger.log(`Executing: ${hlsCommand}`);
      await execPromise(hlsCommand);
      this.logger.log(`HLS transcoding finished for ${streamKey}.`);
      
      // 3. Implemented Real Service Calls
      this.logger.log('Uploading files to Firebase Storage...');
      const hlsUrl = await this.firebaseService.uploadDirectory(outputDir, `vods/${streamKey}`);
      const thumbnailUrl = await this.firebaseService.getFileUrl(`vods/${streamKey}/thumbnail.jpg`);
      this.logger.log(`Upload complete. HLS URL: ${hlsUrl}`);

      await this.videoService.create({
        title: `VOD for stream ${streamKey}`,
        streamKey: streamKey,
        hlsUrl: hlsUrl,
        thumbnailUrl: thumbnailUrl,
      });
      this.logger.log('Video metadata saved to database.');

      await fs.rm(filePath);
      await fs.rm(outputDir, { recursive: true, force: true });

      return { status: 'complete', hlsUrl };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Processing failed for job ${job.id}:`, error.stack);
      } else {
        this.logger.error(`Processing failed for job ${job.id} with an unknown error:`, error);
      }
      
      if (await fs.stat(outputDir).catch(() => false)) {
        await fs.rm(outputDir, { recursive: true, force: true });
      }
      throw error;
    }
  }
}