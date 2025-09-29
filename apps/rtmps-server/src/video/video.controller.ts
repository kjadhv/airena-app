// apps/rtmps-server/src/video/video.controller.ts

import { Controller, Get, Patch, Param, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { VideoService } from './video.service'; // Remove .js extension
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard'; // Remove .js extension
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { uid: string; [key: string]: any; };
}

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  // This endpoint is for creators to see their private and public VODs
  @UseGuards(FirebaseAuthGuard)
  @Get('/me')
  async getMyVideos(@Req() req: RequestWithUser) {
    const firebaseUid = req.user.uid;
    return this.videoService.findByUserId(firebaseUid);
  }

  // This endpoint is for creators to publish a private VOD
  @UseGuards(FirebaseAuthGuard)
  @Patch(':id/publish')
  async publishVideo(@Param('id') videoId: string, @Req() req: RequestWithUser) {
    const firebaseUid = req.user.uid;
    return this.videoService.publish(videoId, firebaseUid);
  }

  // --- THIS IS THE FINAL PIECE ---
  // This is the public endpoint anyone can use to watch a VOD
  @Get(':id')
  async getVideoById(@Param('id') videoId: string) {
    const video = await this.videoService.findPublicById(videoId);
    
    // If the video doesn't exist or its status is not 'public',
    // return a 404 error.
    if (!video) {
      throw new NotFoundException('Video not found or is not public');
    }
    return video;
  }
}