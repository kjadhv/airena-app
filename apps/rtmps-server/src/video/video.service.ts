import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video } from './video.entity';

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
  ) {}

  // We will build this out later
  async create(videoData: Partial<Video>): Promise<Video> {
    const newVideo = this.videoRepository.create(videoData);
    return this.videoRepository.save(newVideo);
  }
}