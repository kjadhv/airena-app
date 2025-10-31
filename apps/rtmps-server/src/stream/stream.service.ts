import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Stream } from "./stream.entity";
import { User } from "./user.entity";
import { randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";
import { Express } from 'express';
import { getStorage } from 'firebase-admin/storage';
import * as path from 'path';
import { VideoService } from '../video/video.service';

export interface StreamCredentials {
  streamKey: string;
  streamUrl: string;
  playbackUrl: string;
}

// ✅ UPDATED: Added streamKey, playbackUrl, and isActive
export interface LiveStreamDto {
  id: string;
  title: string;
  thumbnailUrl?: string;
  authorName: string;
  authorPhotoURL: string | null;
  streamKey: string;
  playbackUrl: string;
  isActive: boolean;
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
    private configService: ConfigService,
    private videoService: VideoService,
  ) {
    this.RTMP_SERVER_URL = this.configService.get<string>("RTMP_SERVER_URL", "rtmp://localhost:1935/live");
    this.HLS_BASE_URL = this.configService.get<string>("HLS_BASE_URL", "http://localhost:8000");
    
    const bucketName = this.configService.get<string>("FIREBASE_STORAGE_BUCKET");
    if (!bucketName) {
      throw new Error("FIREBASE_STORAGE_BUCKET environment variable not set.");
    }
    this.storageBucketName = bucketName;
    
    this.logger.log(`Firebase Storage bucket configured: ${this.storageBucketName}`);
  }

  // ✅ UPDATED: Now returns streamKey, playbackUrl, and isActive
  async getActiveStreams(): Promise<LiveStreamDto[]> {
    const streams = await this.streamRepository.find({
      where: { isActive: true }, 
      relations: ["user"], 
      order: { lastActiveAt: 'DESC' }
    });

    return streams.map((stream) => ({
      id: stream.id,
      title: stream.title || "Untitled Stream",
      thumbnailUrl: stream.thumbnailUrl || `https://placehold.co/1600x900/000000/FFFFFF?text=${encodeURIComponent(stream.title || 'Live')}`,
      authorName: stream.user?.displayName || "Unknown Streamer",
      authorPhotoURL: stream.user?.photoURL || null,
      streamKey: stream.streamKey,
      playbackUrl: `${this.HLS_BASE_URL}/live/${stream.streamKey}/index.m3u8`,
      isActive: stream.isActive,
    }));
  }
  
  async getStreamCredentials(detailsDto: StreamDetailsDto, thumbnailFile: Express.Multer.File): Promise<StreamCredentials> {
    this.logger.log(`🔑 Getting stream credentials for user: ${detailsDto.email}`);
    
    // Find or create user
    const user = await this.findOrCreateUser(detailsDto);
    
    // Always generate a NEW stream key
    const newStreamKey = this.generateStreamKey();
    this.logger.log(`🎲 Generated NEW stream key: ${newStreamKey}`);
    
    // Find existing stream or create new one
    let stream = await this.streamRepository.findOne({ where: { userId: user.id } });
    
    if (stream) {
      this.logger.log(`📝 Updating existing stream. Old key: ${stream.streamKey} → New key: ${newStreamKey}`);
      stream.streamKey = newStreamKey;
      stream.isActive = false;
    } else {
      this.logger.log(`✨ Creating new stream for user: ${user.email}`);
      stream = this.streamRepository.create({
        user,
        userId: user.id,
        streamKey: newStreamKey,
        streamUrl: `${this.RTMP_SERVER_URL}`,
        title: detailsDto.title || `${user.displayName}'s Stream`,
        isActive: false,
      });
    }
    
    // Upload thumbnail
    let thumbnailUrl = '';
    try {
      if (thumbnailFile) {
        thumbnailUrl = await this.saveThumbnailAndGetUrl(thumbnailFile, stream.streamKey);
        this.logger.log(`✅ Thumbnail uploaded: ${thumbnailUrl}`);
      } else {
        this.logger.warn('⚠️ No thumbnail file provided');
        thumbnailUrl = `https://placehold.co/1600x900/000000/FFFFFF?text=${encodeURIComponent(detailsDto.title || 'Stream')}`;
      }
    } catch (error: any) {
      this.logger.error(`❌ Thumbnail upload failed: ${error.message}`);
      thumbnailUrl = `https://placehold.co/1600x900/000000/FFFFFF?text=${encodeURIComponent(detailsDto.title || 'Stream')}`;
    }

    // Update stream details
    stream.title = detailsDto.title;
    stream.description = detailsDto.description;
    stream.thumbnailUrl = thumbnailUrl;
    
    await this.streamRepository.save(stream);

    this.logger.log(`✅ Stream credentials ready: ${stream.streamKey}`);
    this.logger.log(`📡 RTMP URL: ${this.RTMP_SERVER_URL}/${stream.streamKey}`);

    return {
      streamKey: stream.streamKey,
      streamUrl: `${this.RTMP_SERVER_URL}`,
      playbackUrl: `${this.HLS_BASE_URL}/live/${stream.streamKey}/index.m3u8`,
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
      const bucket = getStorage().bucket();
      this.logger.log('Bucket obtained, checking if it exists...');
      
      const [exists] = await bucket.exists();
      if (!exists) {
        this.logger.error('❌ Storage bucket does not exist!');
        throw new Error(`Storage bucket does not exist. Check FIREBASE_STORAGE_BUCKET.`);
      }
      
      this.logger.log('✅ Bucket exists, uploading file...');
      
      const fileExtension = path.extname(file.originalname) || '.jpg';
      const fileName = `thumbnails/${streamKey}${fileExtension}`;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
        public: true,
        validation: false,
      });

      await fileUpload.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      this.logger.log(`✅ Thumbnail uploaded successfully: ${publicUrl}`);
      
      return publicUrl;

    } catch (error: any) {
      this.logger.error(`Failed to upload thumbnail for stream ${streamKey}`);
      this.logger.error(`Error message: ${error.message}`);
      this.logger.error(`Error code: ${error.code}`);
      
      if (error.code === 404 || error.message.includes('does not exist')) {
        this.logger.error(`BUCKET NOT FOUND! Current bucket name: ${this.storageBucketName}`);
        this.logger.error(`Please verify this bucket name exists in Firebase Console -> Storage`);
        this.logger.error(`Thumbnail upload failed, using placeholder`);
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
    
    this.logger.log(`Found user: ${user.email} (ID: ${user.id})`);
    
    const stream = await this.streamRepository.findOne({ 
      where: { userId: user.id }, 
      relations: ['user']
    });
    
    if (!stream) {
      this.logger.warn(`No stream found for user: ${user.email}`);
      return null;
    }

    this.logger.log(`Found stream with key: ${stream.streamKey}`);

    return {
      ...stream,
      streamKey: stream.streamKey,
      streamUrl: `${this.RTMP_SERVER_URL}`,
      playbackUrl: `${this.HLS_BASE_URL}/live/${stream.streamKey}/index.m3u8`,
    };
  }

  async regenerateStreamKey(firebaseUid: string): Promise<StreamCredentials> {
    this.logger.log(`🔄 Regenerating stream key for firebaseUid: ${firebaseUid}`);
    
    const user = await this.userRepository.findOne({ where: { firebaseUid } });
    if (!user) {
      this.logger.error(`❌ User not found with firebaseUid: ${firebaseUid}`);
      throw new NotFoundException("User not found.");
    }
    
    const stream = await this.streamRepository.findOne({ where: { userId: user.id } });
    if (!stream) {
      this.logger.error(`❌ Stream not found for user: ${user.email}`);
      throw new NotFoundException("Stream not found for the user.");
    }

    const oldKey = stream.streamKey;
    stream.streamKey = this.generateStreamKey();
    stream.isActive = false;
    await this.streamRepository.save(stream);

    this.logger.log(`✅ Stream key regenerated: ${oldKey} → ${stream.streamKey}`);

    return {
      streamKey: stream.streamKey,
      streamUrl: `${this.RTMP_SERVER_URL}`,
      playbackUrl: `${this.HLS_BASE_URL}/live/${stream.streamKey}/index.m3u8`,
    };
  }
  
  async getStreamByKey(streamKey: string): Promise<Stream | null> {
    return this.streamRepository.findOne({ where: { streamKey }, relations: ["user"] });
  }

  async updateStreamStatus(streamKey: string, isActive: boolean): Promise<void> {
    const stream = await this.streamRepository.findOne({ 
      where: { streamKey }, 
      relations: ["user"] 
    });
    
    if (!stream) {
      this.logger.warn(`⚠️ Stream not found for key ${streamKey} - it may have been regenerated`);
      return;
    }
    
    const wasActive = stream.isActive;
    stream.isActive = isActive;
    
    if (isActive) {
      stream.lastActiveAt = new Date();
      this.logger.log(`🔴 Stream ${streamKey} went LIVE`);
    } else if (wasActive && !isActive) {
      this.logger.log(`⚫ Stream ${streamKey} ended - creating VOD`);
      await this.createVODFromStream(stream);
    }
    
    await this.streamRepository.save(stream);
  }

  private async createVODFromStream(stream: Stream): Promise<void> {
    try {
      const vodHlsUrl = `${this.HLS_BASE_URL}/live/${stream.streamKey}/index.m3u8`;
      
      const video = await this.videoService.createWithUploader(
        {
          title: stream.title || `${stream.user?.displayName}'s Stream`,
          streamKey: stream.streamKey,
          hlsUrl: vodHlsUrl,
          thumbnailUrl: stream.thumbnailUrl || '',
        },
        stream.userId
      );
      
      this.logger.log(`✅ VOD created successfully for stream ${stream.streamKey} with video ID ${video.id}`);
      
    } catch (error: any) {
      this.logger.error(`❌ Failed to create VOD for stream ${stream.streamKey}: ${error.message}`);
    }
  }

  private async findOrCreateUser(userDto: { userId: string, email: string, displayName: string }): Promise<User> {
    if (!userDto.userId) {
      throw new Error('userId (firebaseUid) is required');
    }
    if (!userDto.email) {
      throw new Error('email is required');
    }
    
    this.logger.log(`🔍 Looking for user with firebaseUid: ${userDto.userId}`);
    
    let user = await this.userRepository.findOne({ where: { firebaseUid: userDto.userId } });
    
    if (user) {
      this.logger.log(`✅ Found existing user: ${user.email} (ID: ${user.id})`);
      
      let needsUpdate = false;
      if (user.email !== userDto.email) {
        this.logger.log(`📝 Updating email: ${user.email} → ${userDto.email}`);
        user.email = userDto.email;
        needsUpdate = true;
      }
      if (user.displayName !== userDto.displayName) {
        this.logger.log(`📝 Updating displayName: ${user.displayName} → ${userDto.displayName}`);
        user.displayName = userDto.displayName;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await this.userRepository.save(user);
        this.logger.log(`✅ User info updated`);
      }
      
      return user;
    }

    this.logger.log(`✨ Creating new user: ${userDto.email}`);
    
    // ✅ FIXED: Use proper object structure that matches User entity
    const newUser = new User();
    newUser.firebaseUid = userDto.userId;
    newUser.email = userDto.email;
    newUser.displayName = userDto.displayName || userDto.email.split('@')[0] || "New User";
    newUser.isCreator = false;
    newUser.isAdmin = false;
    
    const savedUser = await this.userRepository.save(newUser);
    this.logger.log(`✅ New user created with ID: ${savedUser.id}`);
    
    return savedUser;
  }

  private generateStreamKey(): string {
    return randomBytes(16).toString("hex");
  }
}