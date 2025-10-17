import { Injectable, NotFoundException, Logger, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Stream } from "./stream.entity";
import { User } from "./user.entity";
import { randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";
import { Express } from 'express';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import * as path from 'path';

export interface StreamCredentials {
  streamKey: string;
  streamUrl: string;
  playbackUrl: string;
}

export interface LiveStreamDto {
  id: string;
  title: string;
  thumbnailUrl?: string;
  authorName: string;
  authorPhotoURL: string | null;
}

interface StreamDetailsDto {
  userId: string;
  email: string;
  displayName: string;
  title: string;
  description: string;
}

@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);
  private readonly RTMP_SERVER_URL: string;
  private readonly HLS_BASE_URL: string;
  private readonly storageBucketName: string;

  constructor(
    @InjectRepository(Stream)
    private streamRepository: Repository<Stream>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService
  ) {
    this.RTMP_SERVER_URL = this.configService.get<string>("RTMP_SERVER_URL", "rtmp://localhost:1935/live");
    this.HLS_BASE_URL = this.configService.get<string>("HLS_BASE_URL", "http://localhost:8000/live");
    
    const bucketName = this.configService.get<string>("FIREBASE_STORAGE_BUCKET");
    if (!bucketName) {
      throw new Error("FIREBASE_STORAGE_BUCKET environment variable not set.");
    }
    this.storageBucketName = bucketName;
    
    // Log the bucket name to verify it's correct
    this.logger.log(`Firebase Storage bucket configured: ${this.storageBucketName}`);
  }

  async getActiveStreams(): Promise<LiveStreamDto[]> {
    const streams = await this.streamRepository.find({
      where: { isActive: true }, relations: ["user"], order: { lastActiveAt: 'DESC' }
    });

    return streams.map((stream) => ({
      id: stream.id,
      title: stream.title || "Untitled Stream",
      thumbnailUrl: stream.thumbnailUrl || `https://placehold.co/1600x900/000000/FFFFFF?text=${encodeURIComponent(stream.title || 'Live')}`,
      authorName: stream.user?.displayName || "Unknown Streamer",
      authorPhotoURL: stream.user?.photoURL || null,
    }));
  }
  
  async getStreamCredentials(detailsDto: StreamDetailsDto, thumbnailFile: Express.Multer.File): Promise<StreamCredentials> {
    const user = await this.findOrCreateUser(detailsDto);
    let stream = await this.streamRepository.findOne({ where: { userId: user.id } });
    if (!stream) {
      stream = await this.createStreamForUser(user);
    }
    
    // Try to upload thumbnail, but don't fail if it doesn't work
    let thumbnailUrl = '';
    try {
      thumbnailUrl = await this.saveThumbnailAndGetUrl(thumbnailFile, stream.streamKey);
      this.logger.log(`Thumbnail uploaded successfully: ${thumbnailUrl}`);
    } catch (error: any) {
      this.logger.error(`Thumbnail upload failed, using placeholder`, error.message);
      // Use a placeholder instead of failing completely
      thumbnailUrl = `https://placehold.co/1600x900/000000/FFFFFF?text=${encodeURIComponent(detailsDto.title || 'Stream')}`;
    }

    stream.title = detailsDto.title;
    stream.description = detailsDto.description;
    stream.thumbnailUrl = thumbnailUrl;
    await this.streamRepository.save(stream);

    return {
      streamKey: stream.streamKey,
      streamUrl: `${this.RTMP_SERVER_URL}`,
      playbackUrl: `${this.HLS_BASE_URL}/${stream.streamKey}/index.m3u8`,
    };
  }

  private async saveThumbnailAndGetUrl(file: Express.Multer.File, streamKey: string): Promise<string> {
    if (!file) {
      this.logger.warn('No file provided for thumbnail upload');
      return '';
    }

    this.logger.log(`Starting thumbnail upload for stream ${streamKey}`);
    this.logger.log(`File size: ${file.size} bytes, mimetype: ${file.mimetype}`);
    this.logger.log(`Target bucket: ${this.storageBucketName}`);
    
    try {
      // Get bucket without explicit name (uses default from initialization)
      const bucket = getStorage().bucket();
      
      this.logger.log(`Bucket obtained, checking if it exists...`);
      
      // Verify bucket is accessible
      const [exists] = await bucket.exists();
      if (!exists) {
        throw new Error(`Storage bucket does not exist or is not accessible. Check your FIREBASE_STORAGE_BUCKET environment variable.`);
      }
      
      this.logger.log(`Bucket exists and is accessible`);
      
      const fileExtension = path.extname(file.originalname) || '.jpg';
      const fileName = `thumbnails/${streamKey}${fileExtension}`;
      const fileUpload = bucket.file(fileName);

      this.logger.log(`Uploading to: ${fileName}`);

      // Use save method (more reliable than streams)
      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
        public: true,
        validation: false,
      });

      this.logger.log(`File uploaded, making it public...`);

      // Make the file public
      await fileUpload.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      this.logger.log(`Thumbnail uploaded successfully: ${publicUrl}`);
      
      return publicUrl;

    } catch (error: any) {
      this.logger.error(`Failed to upload thumbnail for stream ${streamKey}`);
      this.logger.error(`Error message: ${error.message}`);
      this.logger.error(`Error code: ${error.code}`);
      
      // Log the full error for debugging
      if (error.message?.includes('does not exist')) {
        this.logger.error(`BUCKET NOT FOUND! Current bucket name: ${this.storageBucketName}`);
        this.logger.error(`Please verify this bucket name exists in Firebase Console -> Storage`);
      }
      
      throw error;
    }
  }

  async getExistingCredentials(firebaseUid: string): Promise<(Stream & StreamCredentials) | null> {
    this.logger.log(`Looking for user with firebaseUid: ${firebaseUid}`);
    
    const user = await this.userRepository.findOne({ where: { firebaseUid } });
    if (!user) {
      this.logger.warn(`No user found with firebaseUid: ${firebaseUid}`);
      return null;
    }
    
    this.logger.log(`Found user: ${user.id}, email: ${user.email}, looking for stream...`);
    
    const stream = await this.streamRepository.findOne({ 
      where: { userId: user.id }, relations: ['user']
    });
    
    if (!stream) {
      this.logger.warn(`No stream found for userId: ${user.id}`);
      return null;
    }

    this.logger.log(`Found stream with key: ${stream.streamKey}`);

    return {
      ...stream,
      streamKey: stream.streamKey,
      streamUrl: `${this.RTMP_SERVER_URL}`,
      playbackUrl: `${this.HLS_BASE_URL}/${stream.streamKey}/index.m3u8`,
    };
  }

  async regenerateStreamKey(firebaseUid: string): Promise<StreamCredentials> {
    const user = await this.userRepository.findOne({ where: { firebaseUid } });
    if (!user) throw new NotFoundException("User not found.");
    
    const stream = await this.streamRepository.findOne({ where: { userId: user.id } });
    if (!stream) throw new NotFoundException("Stream not found for the user.");

    stream.streamKey = this.generateStreamKey();
    stream.isActive = false;
    await this.streamRepository.save(stream);

    return {
      streamKey: stream.streamKey,
      streamUrl: `${this.RTMP_SERVER_URL}`,
      playbackUrl: `${this.HLS_BASE_URL}/${stream.streamKey}/index.m3u8`,
    };
  }
  
  async getStreamByKey(streamKey: string): Promise<Stream | null> {
    return this.streamRepository.findOne({ where: { streamKey }, relations: ["user"] });
  }

  async updateStreamStatus(streamKey: string, isActive: boolean): Promise<void> {
    const stream = await this.streamRepository.findOne({ where: { streamKey } });
    if (!stream) {
      this.logger.warn(`Stream not found for key ${streamKey}`);
      return;
    }
    stream.isActive = isActive;
    if (isActive) {
        stream.lastActiveAt = new Date();
    }
    await this.streamRepository.save(stream);
  }

  private async findOrCreateUser(userDto: { userId: string, email: string, displayName: string }): Promise<User> {
    let user = await this.userRepository.findOne({ where: { firebaseUid: userDto.userId } });
    if (user) return user;

    const newUser = this.userRepository.create({
      firebaseUid: userDto.userId,
      email: userDto.email,
      displayName: userDto.displayName || "New User",
    });
    return this.userRepository.save(newUser);
  }

  private async createStreamForUser(user: User): Promise<Stream> {
    const streamKey = this.generateStreamKey();
    const newStream = this.streamRepository.create({
      user,
      userId: user.id,
      streamKey,
      streamUrl: `${this.RTMP_SERVER_URL}`,
      title: `${user.displayName}'s Stream`,
      isActive: false,
    });
    return this.streamRepository.save(newStream);
  }

  private generateStreamKey(): string {
    return `live_${randomBytes(12).toString("hex")}`;
  }
}