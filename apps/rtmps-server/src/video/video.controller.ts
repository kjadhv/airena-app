import { Controller, Get, Patch, Param, UseGuards, Req, NotFoundException, Post } from '@nestjs/common';
import { VideoService } from './video.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { VodProcessorService } from '../vod-processor/vod-processor.service';
import { Request } from 'express';

// Import will be handled by dependency injection via module
// The VodProcessorService will be available through VideoModule imports

interface RequestWithUser extends Request {
  user: { uid: string; [key: string]: any; };
}

@Controller('videos')
export class VideoController {
  constructor(
    private readonly videoService: VideoService,
    private readonly vodProcessorService: VodProcessorService,
  ) {}

  // Get all videos for the authenticated user (private and public)
  @UseGuards(FirebaseAuthGuard)
  @Get('/me')
  async getMyVideos(@Req() req: RequestWithUser) {
    const firebaseUid = req.user.uid;
    return this.videoService.findByUserId(firebaseUid);
  }

  // Publish a private VOD
  @UseGuards(FirebaseAuthGuard)
  @Patch(':id/publish')
  async publishVideo(@Param('id') videoId: string, @Req() req: RequestWithUser) {
    const firebaseUid = req.user.uid;
    return this.videoService.publish(videoId, firebaseUid);
  }

  // Get a specific public VOD by ID
  @Get(':id')
  async getVideoById(@Param('id') videoId: string) {
    const video = await this.videoService.findPublicById(videoId);
    
    if (!video) {
      throw new NotFoundException('Video not found or is not public');
    }
    return video;
  }

  // NEW: Get VODs for a specific stream key
  // Useful for showing "Past broadcasts" on a stream page
  @Get('stream/:streamKey')
  async getVideosByStreamKey(@Param('streamKey') streamKey: string) {
    return this.videoService.findByStreamKey(streamKey);
  }

  // NEW: Get all public VODs (for browse/discover page)
  @Get()
  async getAllPublicVideos() {
    return this.videoService.findAllPublic();
  }

  // NEW: Manual trigger to process a VOD (for testing/retry)
  @UseGuards(FirebaseAuthGuard)
  @Post(':id/process')
  async processVideo(@Param('id') videoId: string, @Req() req: RequestWithUser) {
    const video = await this.videoService.findById(videoId);
    
    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Check authorization
    if (video.uploaderId !== req.user.uid) {
      throw new NotFoundException('Video not found');
    }

    await this.vodProcessorService.processVOD(video);
    
    return { message: 'VOD processing started', videoId };
  }
}