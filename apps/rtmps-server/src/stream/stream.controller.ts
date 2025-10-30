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
  UseInterceptors,
  UploadedFile,
  Query,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { StreamService, StreamCredentials, LiveStreamDto } from "./stream.service";
import { Express } from 'express';

interface StreamDetailsDto {
  userId: string;
  email: string;
  displayName: string;
  title: string;
  description:string;
}

interface StreamStatusHookDto {
  streamKey: string;
  isActive: boolean;
}

@Controller("stream")
export class StreamController {
  private readonly logger = new Logger(StreamController.name);
  constructor(private readonly streamService: StreamService) {}

  @Get("live")
  async getLiveStreams(): Promise<LiveStreamDto[]> {
    return this.streamService.getActiveStreams();
  }

  @Get("credentials")
  async getExistingCredentials(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException("userId query parameter is required");
    
    this.logger.log(`Getting existing credentials for userId: ${userId}`);
    
    const credentials = await this.streamService.getExistingCredentials(userId);
    
    if (!credentials) {
      this.logger.log(`No existing credentials found for userId: ${userId}`);
      return { exists: false };
    }
    
    this.logger.log(`Found existing credentials for userId: ${userId}`);
    return credentials;
  }

  @Post("credentials")
  @UseInterceptors(FileInterceptor('thumbnail'))
  async getStreamCredentials(
    @Body() detailsDto: StreamDetailsDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<StreamCredentials> {
    if (!detailsDto.userId) throw new BadRequestException("userId is required");
    if (!detailsDto.email) throw new BadRequestException("email is required");
    if (!detailsDto.displayName) throw new BadRequestException("displayName is required");
    if (!file) throw new BadRequestException("thumbnail file is required");

    this.logger.log(`Creating stream credentials for user: ${detailsDto.email}`);
    
    return this.streamService.getStreamCredentials(detailsDto, file);
  }
  
  @Post("hooks/status")
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateStreamStatusFromHook(@Body() hookDto: StreamStatusHookDto): Promise<void> {
    const { streamKey, isActive } = hookDto;
    if (!streamKey) throw new BadRequestException("streamKey is required");
    
    this.logger.log(`Webhook: Stream ${streamKey} status update: ${isActive ? 'LIVE' : 'OFFLINE'}`);
    
    await this.streamService.updateStreamStatus(streamKey, isActive);
  }

  @Post("regenerate-key")
  async regenerateStreamKey(@Body("userId") userId: string): Promise<StreamCredentials> {
    if (!userId) throw new BadRequestException("userId is required");
    
    this.logger.log(`Regenerating stream key for userId: ${userId}`);
    
    return this.streamService.regenerateStreamKey(userId);
  }

  @Get("status/:streamKey")
  async getStreamStatus(@Param("streamKey") streamKey: string) {
    const stream = await this.streamService.getStreamByKey(streamKey);
    if (!stream) throw new NotFoundException(`Stream with key ${streamKey} not found`);
    return {
      isActive: stream.isActive,
      title: stream.title,
      authorName: stream.user?.displayName,
    };
  }
}