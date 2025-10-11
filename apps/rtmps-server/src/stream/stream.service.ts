import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Stream } from "./stream.entity";
import { User } from "./user.entity";
import { randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";

// --- DTOs and Interfaces ---

export interface StreamCredentials {
  streamKey: string;
  streamUrl: string;
  playbackUrl: string;
}

// This DTO matches the frontend's 'LivestreamData' type exactly.
export interface LiveStreamDto {
  id: string;
  title: string;
  thumbnailUrl?: string;
  authorName: string;
  authorPhotoURL: string | null;
}

interface UserDto {
  userId: string;
  email: string;
  displayName: string;
}

@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);
  private readonly RTMP_SERVER_URL: string;
  private readonly HLS_BASE_URL: string;

  constructor(
    @InjectRepository(Stream)
    private streamRepository: Repository<Stream>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService
  ) {
    // Removed trailing slashes to prevent double slashes in URLs
    this.RTMP_SERVER_URL = this.configService.get<string>("RTMP_SERVER_URL", "rtmp://localhost:1935/live");
    this.HLS_BASE_URL = this.configService.get<string>("HLS_BASE_URL", "http://localhost:8000/live");
  }

  /**
   * ✨ UPGRADED: Fetches all active streams and maps them to a clean DTO.
   * This now includes a dynamic placeholder for thumbnails.
   */
  async getActiveStreams(): Promise<LiveStreamDto[]> {
    const streams = await this.streamRepository.find({
      where: { isActive: true },
      relations: ["user"],
      order: { lastActiveAt: 'DESC' } // Show the most recent streams first
    });

    return streams.map((stream) => ({
      id: stream.id,
      title: stream.title || "Untitled Stream",
      // Use the stored thumbnail or generate a nice placeholder.
      thumbnailUrl: stream.thumbnailUrl || `https://placehold.co/1600x900/000000/FFFFFF?text=${encodeURIComponent(stream.title || 'Live')}`,
      authorName: stream.user?.displayName || "Unknown Streamer",
      authorPhotoURL: stream.user?.photoURL || null,
    }));
  }
  
  async getStreamCredentials(userDto: UserDto): Promise<StreamCredentials> {
    this.logger.log(`Getting stream credentials for user ${userDto.userId}`);
    const user = await this.findOrCreateUser(userDto);

    let stream = await this.streamRepository.findOne({ where: { userId: user.id } });
    if (!stream) {
      this.logger.log(`No existing stream found for user ${user.id}, creating a new one.`);
      stream = await this.createStreamForUser(user);
    }

    return {
      streamKey: stream.streamKey,
      streamUrl: `${this.RTMP_SERVER_URL}/${stream.streamKey}`,
      playbackUrl: `${this.HLS_BASE_URL}/${stream.streamKey}/index.m3u8`,
    };
  }

  async regenerateStreamKey(firebaseUid: string): Promise<StreamCredentials> {
    this.logger.log(`Regenerating stream key for user ${firebaseUid}`);
    const user = await this.userRepository.findOne({ where: { firebaseUid } });
    if (!user) throw new NotFoundException("User not found.");
    
    const stream = await this.streamRepository.findOne({ where: { userId: user.id } });
    if (!stream) throw new NotFoundException("Stream not found for the user.");

    stream.streamKey = this.generateStreamKey();
    stream.isActive = false;
    await this.streamRepository.save(stream);

    return {
      streamKey: stream.streamKey,
      streamUrl: `${this.RTMP_SERVER_URL}/${stream.streamKey}`,
      playbackUrl: `${this.HLS_BASE_URL}/${stream.streamKey}/index.m3u8`,
    };
  }
  
  async getStreamByKey(streamKey: string): Promise<Stream | null> {
    return this.streamRepository.findOne({
      where: { streamKey },
      relations: ["user"],
    });
  }

  async updateStreamStatus(streamKey: string, isActive: boolean): Promise<void> {
    this.logger.log(`Updating stream status for ${streamKey}: ${isActive ? "ACTIVE" : "INACTIVE"}`);
    const stream = await this.streamRepository.findOne({ where: { streamKey } });
    if (!stream) {
      this.logger.warn(`Stream not found for key ${streamKey}`);
      return;
    }
    stream.isActive = isActive;
    // Only update lastActiveAt when the stream *starts*
    if (isActive) {
        stream.lastActiveAt = new Date();
    }
    await this.streamRepository.save(stream);
  }

  private async findOrCreateUser(userDto: UserDto): Promise<User> {
    let user = await this.userRepository.findOne({ where: { firebaseUid: userDto.userId } });
    if (user) return user;

    this.logger.log(`Creating new user record for firebaseUid ${userDto.userId}`);
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
      streamUrl: `${this.RTMP_SERVER_URL}/${streamKey}`,
      title: `${user.displayName}'s Stream`, // Default title
      isActive: false,
    });
    return this.streamRepository.save(newStream);
  }

  // Improved key generation for better readability
  private generateStreamKey(): string {
    return `live_${randomBytes(12).toString("hex")}`;
  }
}
