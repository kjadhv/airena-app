// apps/rtmps-server/src/video/video.service.ts
import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, VideoStatus } from './video.entity';
import { User } from '../stream/user.entity';

// Define proper DTOs for the service methods
export interface CreateVideoDto {
  title: string;
  streamKey: string;
  hlsUrl: string;
  thumbnailUrl: string;
}

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
  ) {}

  /**
   * Creates a new video record, typically called by the video processor.
   * This version doesn't require an uploader ID (for system-generated videos)
   */
  async create(videoData: CreateVideoDto): Promise<Video> {
    const newVideo = this.videoRepository.create({
      title: videoData.title,
      streamKey: videoData.streamKey,
      hlsUrl: videoData.hlsUrl,
      thumbnailUrl: videoData.thumbnailUrl,
      // status will default to PRIVATE as defined in the entity
      // uploaderId is optional, so it can be null
    });
    return this.videoRepository.save(newVideo);
  }

  /**
   * Creates a new video record with uploader information
   */
  async createWithUploader(videoData: CreateVideoDto, uploaderId: string): Promise<Video> {
    const newVideo = this.videoRepository.create({
      title: videoData.title,
      streamKey: videoData.streamKey,
      hlsUrl: videoData.hlsUrl,
      thumbnailUrl: videoData.thumbnailUrl,
      uploaderId: uploaderId,
      // status will default to PRIVATE as defined in the entity
    });
    return this.videoRepository.save(newVideo);
  }

  /**
   * Finds all videos (public and private) for a specific user.
   */
  async findByUserId(uploaderId: string): Promise<Video[]> {
    return this.videoRepository.find({
      where: { uploaderId: uploaderId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Finds all videos ordered by creation date.
   */
  async findAll(): Promise<Video[]> {
    return this.videoRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Finds all public videos.
   */
  async findAllPublic(): Promise<Video[]> {
    return this.videoRepository.find({
      where: { status: VideoStatus.PUBLIC },
      order: { createdAt: 'DESC' },
    });
  }
  
  /**
   * Finds a single public video by its ID.
   */
  async findPublicById(videoId: string): Promise<Video | null> {
    return this.videoRepository.findOne({ 
      where: { id: videoId, status: VideoStatus.PUBLIC } 
    });
  }

  /**
   * Finds a video by its ID regardless of status.
   */
  async findById(videoId: string): Promise<Video | null> {
    return this.videoRepository.findOne({ 
      where: { id: videoId } 
    });
  }

  /**
   * Finds videos by stream key.
   */
  async findByStreamKey(streamKey: string): Promise<Video[]> {
    return this.videoRepository.find({
      where: { streamKey },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Changes a video's status from 'private' to 'public'.
   * Includes authorization check if uploaderId is provided.
   */
  async publish(videoId: string, uploaderId?: string): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Authorization check if uploaderId is provided and video has an uploader
    if (uploaderId && video.uploaderId && video.uploaderId !== uploaderId) {
      throw new UnauthorizedException('You are not authorized to publish this video');
    }

    if (video.status === VideoStatus.PUBLIC) {
      return video; // Already public
    }

    video.status = VideoStatus.PUBLIC;
    return this.videoRepository.save(video);
  }

  /**
   * Changes a video's status from 'public' to 'private'.
   * Includes authorization check if uploaderId is provided.
   */
  async unpublish(videoId: string, uploaderId?: string): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Authorization check if uploaderId is provided and video has an uploader
    if (uploaderId && video.uploaderId && video.uploaderId !== uploaderId) {
      throw new UnauthorizedException('You are not authorized to unpublish this video');
    }

    if (video.status === VideoStatus.PRIVATE) {
      return video; // Already private
    }

    video.status = VideoStatus.PRIVATE;
    return this.videoRepository.save(video);
  }

  /**
   * Deletes a video by its ID.
   * Includes authorization check if uploaderId is provided.
   */
  async delete(videoId: string, uploaderId?: string): Promise<void> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Authorization check if uploaderId is provided and video has an uploader
    if (uploaderId && video.uploaderId && video.uploaderId !== uploaderId) {
      throw new UnauthorizedException('You are not authorized to delete this video');
    }

    await this.videoRepository.delete(videoId);
  }

  /**
   * Updates video metadata.
   * Includes authorization check if uploaderId is provided.
   */
  async update(videoId: string, updateData: Partial<CreateVideoDto>, uploaderId?: string): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Authorization check if uploaderId is provided and video has an uploader
    if (uploaderId && video.uploaderId && video.uploaderId !== uploaderId) {
      throw new UnauthorizedException('You are not authorized to update this video');
    }

    Object.assign(video, updateData);
    return this.videoRepository.save(video);
  }
}