import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { StreamService, StreamCredentials, LiveStreamDto } from "./stream.service";

// --- DTOs for incoming data validation ---
interface UserDto {
  userId: string;
  email: string;
  displayName: string;
}

// ✨ NEW: DTO for the hook payload from the RTMP server
interface StreamStatusHookDto {
  streamKey: string;
  isActive: boolean;
}

@Controller("stream")
export class StreamController {
  private readonly logger = new Logger(StreamController.name);
  constructor(private readonly streamService: StreamService) {}

  // --- Public Endpoints (for Frontend) ---

  @Get("live")
  async getLiveStreams(): Promise<LiveStreamDto[]> {
    this.logger.log("GET /stream/live requested");
    return this.streamService.getActiveStreams();
  }

  @Post("credentials")
  async getStreamCredentials(@Body() userDto: UserDto): Promise<StreamCredentials> {
    this.logger.log(`POST /stream/credentials for user ${userDto.userId}`);
    if (!userDto.userId) throw new BadRequestException("userId is required");
    return this.streamService.getStreamCredentials(userDto);
  }

  // --- ✨ NEW: Internal Hook Endpoint (for RTMP Server) ---

  /**
   * Receives status updates from the RTMP server (NMS).
   * This should only be called by the RTMP server.
   */
  @Post("hooks/status")
  @HttpCode(HttpStatus.NO_CONTENT) // Send back a 204 No Content response on success
  async updateStreamStatusFromHook(@Body() hookDto: StreamStatusHookDto): Promise<void> {
    const { streamKey, isActive } = hookDto;
    this.logger.log(`[HOOK] Received status update for ${streamKey}: ${isActive ? 'START' : 'STOP'}`);
    if (!streamKey) throw new BadRequestException("streamKey is required");
    
    await this.streamService.updateStreamStatus(streamKey, isActive);
  }

  // --- Other existing endpoints remain unchanged ---

  @Post("regenerate-key")
  async regenerateStreamKey(@Body("userId") userId: string): Promise<StreamCredentials> {
    this.logger.log(`POST /stream/regenerate-key for user ${userId}`);
    if (!userId) throw new BadRequestException("userId is required");
    return this.streamService.regenerateStreamKey(userId);
  }

  @Get("status/:streamKey")
  async getStreamStatus(@Param("streamKey") streamKey: string) {
    this.logger.log(`GET /stream/status/${streamKey} requested`);
    const stream = await this.streamService.getStreamByKey(streamKey);
    if (!stream) throw new NotFoundException(`Stream with key ${streamKey} not found`);
    return {
      isActive: stream.isActive,
      title: stream.title,
      authorName: stream.user?.displayName,
    };
  }
}
