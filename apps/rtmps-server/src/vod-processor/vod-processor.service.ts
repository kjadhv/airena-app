import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { VideoService } from '../video/video.service';
import { Video } from '../video/video.entity';

const execAsync = promisify(exec);

@Injectable()
export class VodProcessorService {
  private readonly logger = new Logger(VodProcessorService.name);
  private readonly HLS_DIRECTORY: string;
  private readonly VOD_OUTPUT_DIRECTORY: string;
  private readonly storageBucketName: string;

  constructor(
    private readonly videoService: VideoService,
    private readonly configService: ConfigService,
  ) {
    // Directory where your media server saves HLS files
    this.HLS_DIRECTORY = this.configService.get<string>('HLS_DIRECTORY', './media/live');
    
    // Directory for temporary MP4 output
    this.VOD_OUTPUT_DIRECTORY = this.configService.get<string>('VOD_OUTPUT_DIRECTORY', './media/vods');
    
    const bucketName = this.configService.get<string>('FIREBASE_STORAGE_BUCKET');
    if (!bucketName) {
      throw new Error('FIREBASE_STORAGE_BUCKET environment variable not set.');
    }
    this.storageBucketName = bucketName;
  }

  /**
   * Process a VOD: Convert HLS to MP4 and upload to Firebase Storage
   * @param video - The video entity to process
   */
  async processVOD(video: Video): Promise<void> {
    this.logger.log(`Starting VOD processing for video ${video.id} (stream key: ${video.streamKey})`);

    try {
      // 1. Find the local HLS directory for this stream
      const localHlsPath = path.join(this.HLS_DIRECTORY, video.streamKey);
      
      // 2. Check if directory exists
      try {
        await fs.access(localHlsPath);
      } catch (error) {
        throw new Error(`HLS directory not found at ${localHlsPath}`);
      }

      // 3. Ensure VOD output directory exists
      await fs.mkdir(this.VOD_OUTPUT_DIRECTORY, { recursive: true });

      // 4. Convert HLS to MP4
      const mp4Path = await this.convertHLSToMP4(video.streamKey, localHlsPath);

      // 5. Generate thumbnail
      const thumbnailPath = await this.generateThumbnail(mp4Path, video.streamKey);

      // 6. Upload MP4 and thumbnail to Firebase Storage
      const { videoUrl, thumbnailUrl } = await this.uploadToStorage(
        video.streamKey,
        mp4Path,
        thumbnailPath
      );

      // 7. Update video record with new URLs
      await this.videoService.update(video.id, {
        hlsUrl: videoUrl, // Store MP4 URL in hlsUrl field (or rename this field)
        thumbnailUrl: thumbnailUrl,
      });

      this.logger.log(`VOD processing completed for video ${video.id}. Video URL: ${videoUrl}`);

      // 8. Clean up temporary files
      await this.cleanupTempFiles(mp4Path, thumbnailPath);

      // 9. Optional: Clean up local HLS files
      // await this.cleanupLocalFiles(localHlsPath);

    } catch (error: any) {
      this.logger.error(`Failed to process VOD for video ${video.id}`, error.message);
      throw error;
    }
  }

  /**
   * Convert HLS playlist to MP4 using FFmpeg
   */
  private async convertHLSToMP4(streamKey: string, localHlsPath: string): Promise<string> {
    const m3u8Path = path.join(localHlsPath, 'index.m3u8');
    const outputPath = path.join(this.VOD_OUTPUT_DIRECTORY, `${streamKey}.mp4`);

    this.logger.log(`Converting HLS to MP4: ${m3u8Path} -> ${outputPath}`);

    try {
      // Check if FFmpeg is available
      await execAsync('ffmpeg -version');
    } catch (error) {
      throw new Error('FFmpeg is not installed or not available in PATH');
    }

    try {
      // Convert HLS to MP4
      // -c copy: Copy streams without re-encoding (fast)
      // -bsf:a aac_adtstoasc: Fix AAC audio format
      const command = `ffmpeg -i "${m3u8Path}" -c copy -bsf:a aac_adtstoasc "${outputPath}" -y`;
      
      this.logger.log(`Executing: ${command}`);
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        this.logger.debug(`FFmpeg stderr: ${stderr}`);
      }

      // Verify output file exists
      await fs.access(outputPath);
      
      const stats = await fs.stat(outputPath);
      this.logger.log(`MP4 created successfully: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      return outputPath;

    } catch (error: any) {
      this.logger.error(`Failed to convert HLS to MP4`, error.message);
      throw error;
    }
  }

  /**
   * Generate a thumbnail from the MP4 video
   */
  async generateThumbnail(videoPath: string, streamKey: string): Promise<string> {
    const thumbnailPath = path.join(this.VOD_OUTPUT_DIRECTORY, `${streamKey}_thumb.jpg`);

    this.logger.log(`Generating thumbnail: ${thumbnailPath}`);

    try {
      // Extract frame at 2 seconds (or 10% of video duration)
      // -ss 2: Seek to 2 seconds
      // -vframes 1: Extract 1 frame
      // -vf scale=1280:-1: Scale to 1280px width, maintain aspect ratio
      const command = `ffmpeg -ss 2 -i "${videoPath}" -vframes 1 -vf "scale=1280:-1" "${thumbnailPath}" -y`;
      
      this.logger.log(`Executing: ${command}`);
      
      await execAsync(command);

      // Verify thumbnail exists
      await fs.access(thumbnailPath);
      
      this.logger.log(`Thumbnail created successfully: ${thumbnailPath}`);

      return thumbnailPath;

    } catch (error: any) {
      this.logger.error(`Failed to generate thumbnail`, error.message);
      // Return a default thumbnail URL or throw
      throw error;
    }
  }

  /**
   * Upload MP4 and thumbnail to Firebase Storage
   */
  private async uploadToStorage(
    streamKey: string,
    mp4Path: string,
    thumbnailPath: string
  ): Promise<{ videoUrl: string; thumbnailUrl: string }> {
    const bucket = getStorage().bucket();
    const destinationFolder = `vods/${streamKey}`;

    this.logger.log(`Uploading MP4 and thumbnail to ${destinationFolder}`);

    try {
      // Upload MP4
      const videoFileName = `${streamKey}.mp4`;
      const videoDestination = `${destinationFolder}/${videoFileName}`;
      const videoBuffer = await fs.readFile(mp4Path);

      this.logger.log(`Uploading video: ${videoFileName}`);

      const videoFile = bucket.file(videoDestination);
      await videoFile.save(videoBuffer, {
        metadata: {
          contentType: 'video/mp4',
          cacheControl: 'public, max-age=31536000',
        },
        public: true,
      });

      await videoFile.makePublic();
      const videoUrl = `https://storage.googleapis.com/${bucket.name}/${videoDestination}`;

      this.logger.log(`Video uploaded: ${videoUrl}`);

      // Upload thumbnail
      const thumbnailFileName = `${streamKey}_thumb.jpg`;
      const thumbnailDestination = `${destinationFolder}/${thumbnailFileName}`;
      const thumbnailBuffer = await fs.readFile(thumbnailPath);

      this.logger.log(`Uploading thumbnail: ${thumbnailFileName}`);

      const thumbnailFile = bucket.file(thumbnailDestination);
      await thumbnailFile.save(thumbnailBuffer, {
        metadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000',
        },
        public: true,
      });

      await thumbnailFile.makePublic();
      const thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${thumbnailDestination}`;

      this.logger.log(`Thumbnail uploaded: ${thumbnailUrl}`);

      return { videoUrl, thumbnailUrl };

    } catch (error: any) {
      this.logger.error(`Failed to upload to storage`, error.message);
      throw error;
    }
  }

  /**
   * Clean up temporary MP4 and thumbnail files
   */
  private async cleanupTempFiles(mp4Path: string, thumbnailPath: string): Promise<void> {
    try {
      this.logger.log(`Cleaning up temporary files`);
      
      await fs.unlink(mp4Path);
      await fs.unlink(thumbnailPath);
      
      this.logger.log(`Temporary files cleaned up successfully`);
    } catch (error: any) {
      this.logger.error(`Failed to clean up temporary files`, error.message);
      // Don't throw - cleanup failure shouldn't fail the entire process
    }
  }

  /**
   * Clean up local HLS files after successful upload
   */
  private async cleanupLocalFiles(localHlsPath: string): Promise<void> {
    try {
      this.logger.log(`Cleaning up local HLS files at ${localHlsPath}`);
      
      const files = await fs.readdir(localHlsPath);
      
      // Delete all files in the directory
      await Promise.all(
        files.map(file => fs.unlink(path.join(localHlsPath, file)))
      );
      
      // Remove the directory itself
      await fs.rmdir(localHlsPath);
      
      this.logger.log(`Local HLS files cleaned up successfully`);
    } catch (error: any) {
      this.logger.error(`Failed to clean up local HLS files`, error.message);
      // Don't throw - cleanup failure shouldn't fail the entire process
    }
  }
}