import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { StreamService, StreamCredentials } from './stream.service';

interface UserDto {
  userId: string;
  email: string;
  displayName: string;
}

@Controller('stream')
export class StreamController {
  private readonly logger = new Logger(StreamController.name);

  constructor(private readonly streamService: StreamService) {}

  @Post('credentials')
  async getStreamCredentials(
    @Body() userDto: UserDto,
  ): Promise<StreamCredentials> {
    this.logger.log(`📺 POST /stream/credentials for user: ${userDto.userId}`);
    if (!userDto.userId) {
      throw new BadRequestException('userId in request body is required');
    }
    return this.streamService.getStreamCredentials(userDto);
  }

  @Post('regenerate-key')
  async regenerateStreamKey(
    @Body('userId') userId: string,
  ): Promise<StreamCredentials> {
    this.logger.log(`🔄 POST /stream/regenerate-key for user: ${userId}`);
    if (!userId) {
      throw new BadRequestException('userId in request body is required');
    }
    return this.streamService.regenerateStreamKey(userId);
  }

  // THIS IS THE CORRECTED METHOD
  @Get('status/:streamKey')
  async getStreamStatus(@Param('streamKey') streamKey: string) {
    this.logger.log(`📊 GET /stream/status/${streamKey} requested`);
    
    const stream = await this.streamService.getStreamByKey(streamKey);
    
    if (!stream) {
      throw new NotFoundException(`Stream with key ${streamKey} not found`);
    }

    // By creating a new, plain object like this, we avoid the circular reference
    // and only send the data the frontend needs.
    return {
      isActive: stream.isActive,
      lastActiveAt: stream.lastActiveAt,
      title: stream.title,
    };
  }
}