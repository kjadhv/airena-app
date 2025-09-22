// apps/rtmps-server/src/stream/stream.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Req,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { StreamService } from './stream.service';

// Interface to add the authenticated user to the request object
interface FirebaseRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  /**
   * Gets credentials for the authenticated user.
   * Protected by Firebase Auth Middleware.
   */
  @Get('credentials')
  async getStreamCredentials(@Req() req: FirebaseRequest) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated.');
    return this.streamService.getOrCreateStreamKey(firebaseId);
  }

  /**
   * Generates a new stream key for the authenticated user.
   * Protected by Firebase Auth Middleware.
   */
  @Post('regenerate-key')
  async regenerateStreamKey(@Req() req: FirebaseRequest) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated.');
    return this.streamService.regenerateStreamKey(firebaseId);
  }

  /**
   * Updates settings for the authenticated user.
   * Protected by Firebase Auth Middleware.
   */
  @Put('settings')
  async updateStreamSettings(
    @Req() req: FirebaseRequest,
    @Body() settings: Record<string, any>,
  ) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated.');
    return this.streamService.updateStreamSettings(firebaseId, settings);
  }

  /**
   * Webhook for the media server to call when a stream starts.
   * This route is excluded from auth middleware.
   */
  @Post('start/:streamKey')
  async startStream(@Param('streamKey') streamKey: string) {
    return this.streamService.startStream(streamKey);
  }

  /**
   * Webhook for the media server to call when a stream stops.
   * This route is excluded from auth middleware.
   */
  @Post('stop/:streamKey')
  async stopStream(@Param('streamKey') streamKey: string) {
    return this.streamService.stopStream(streamKey);
  }
  
  /**
   * Public route to get the status and details of a stream.
   * This route is excluded from auth middleware.
   */
  @Get('status/:streamKey')
  async getStreamStatus(@Param('streamKey') streamKey: string) {
    return this.streamService.getStreamDetails(streamKey);
  }
}