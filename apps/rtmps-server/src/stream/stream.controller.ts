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
    
    // FIXED: Handle the null case properly instead of returning null directly
    const credentials = await this.streamService.getExistingCredentials(userId);
    
    if (!credentials) {
      return { exists: false };
    }
    
    return credentials;
  }

  @Post("credentials")
  @UseInterceptors(FileInterceptor('thumbnail'))
  async getStreamCredentials(
    @Body() detailsDto: StreamDetailsDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<StreamCredentials> {
    if (!detailsDto.userId) throw new BadRequestException("userId is required");
    if (!file) throw new BadRequestException("thumbnail file is required");

    return this.streamService.getStreamCredentials(detailsDto, file);
  }
  
  @Post("hooks/status")
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateStreamStatusFromHook(@Body() hookDto: StreamStatusHookDto): Promise<void> {
    const { streamKey, isActive } = hookDto;
    if (!streamKey) throw new BadRequestException("streamKey is required");
    await this.streamService.updateStreamStatus(streamKey, isActive);
  }

  @Post("regenerate-key")
  async regenerateStreamKey(@Body("userId") userId: string): Promise<StreamCredentials> {
    if (!userId) throw new BadRequestException("userId is required");
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
