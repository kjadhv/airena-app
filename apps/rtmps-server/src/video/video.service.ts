import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, VideoStatus } from './video.entity';
import { User } from '../stream/user.entity';

// DTOs
export interface CreateVideoDto {
  title: string;
  streamKey: string;
  hlsUrl: string;
  thumbnailUrl: string;
  uploaderId?: string;
}

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
  ) {}

  async create(videoData: CreateVideoDto): Promise<Video> {
    return this.videoRepository.save(
      this.videoRepository.create({
        ...videoData,
        status: VideoStatus.PRIVATE,
      }),
    );
  }

  async createWithUploader(videoData: CreateVideoDto, uploaderId: string): Promise<Video> {
    return this.create({ ...videoData, uploaderId });
  }

  async findByUserId(uploaderId: string): Promise<Video[]> {
    return this.videoRepository.find({
      where: { uploaderId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<Video[]> {
    return this.videoRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPublic(): Promise<Video[]> {
    return this.videoRepository.find({
      where: { status: VideoStatus.PUBLIC },
      order: { createdAt: 'DESC' },
    });
  }

  async findPublicById(videoId: string): Promise<Video | null> {
    return this.videoRepository.findOne({
      where: { id: videoId, status: VideoStatus.PUBLIC },
    });
  }

  async findById(videoId: string): Promise<Video | null> {
    return this.videoRepository.findOne({
      where: { id: videoId },
    });
  }

  async findByStreamKey(streamKey: string): Promise<Video[]> {
    return this.videoRepository.find({
      where: { streamKey },
      order: { createdAt: 'DESC' },
    });
  }

  async publish(videoId: string, uploaderId?: string): Promise<Video> {
    const video = await this.findById(videoId);
    if (!video) throw new NotFoundException('Video not found');

    if (uploaderId && video.uploaderId && video.uploaderId !== uploaderId) {
      throw new UnauthorizedException('Not authorized');
    }

    if (video.status === VideoStatus.PUBLIC) return video;

    video.status = VideoStatus.PUBLIC;
    return this.videoRepository.save(video);
  }

  async unpublish(videoId: string, uploaderId?: string): Promise<Video> {
    const video = await this.findById(videoId);
    if (!video) throw new NotFoundException('Video not found');

    if (uploaderId && video.uploaderId && video.uploaderId !== uploaderId) {
      throw new UnauthorizedException('Not authorized');
    }

    if (video.status === VideoStatus.PRIVATE) return video;

    video.status = VideoStatus.PRIVATE;
    return this.videoRepository.save(video);
  }

  async delete(videoId: string, uploaderId?: string): Promise<void> {
    const video = await this.findById(videoId);
    if (!video) throw new NotFoundException('Video not found');

    if (uploaderId && video.uploaderId && video.uploaderId !== uploaderId) {
      throw new UnauthorizedException('Not authorized');
    }
    await this.videoRepository.delete(videoId);
  }

  async update(videoId: string, updateData: Partial<CreateVideoDto>, uploaderId?: string): Promise<Video> {
    const video = await this.findById(videoId);
    if (!video) throw new NotFoundException('Video not found');

    if (uploaderId && video.uploaderId && video.uploaderId !== uploaderId) {
      throw new UnauthorizedException('Not authorized');
    }

    Object.assign(video, updateData);
    return this.videoRepository.save(video);
  }
}
