import { Repository } from 'typeorm';
import { Video } from './video.entity';
export interface CreateVideoDto {
    title: string;
    streamKey: string;
    hlsUrl: string;
    thumbnailUrl: string;
}
export declare class VideoService {
    private readonly videoRepository;
    constructor(videoRepository: Repository<Video>);
    create(videoData: CreateVideoDto): Promise<Video>;
    createWithUploader(videoData: CreateVideoDto, uploaderId: string): Promise<Video>;
    findByUserId(uploaderId: string): Promise<Video[]>;
    findAll(): Promise<Video[]>;
    findAllPublic(): Promise<Video[]>;
    findPublicById(videoId: string): Promise<Video | null>;
    findById(videoId: string): Promise<Video | null>;
    findByStreamKey(streamKey: string): Promise<Video[]>;
    publish(videoId: string, uploaderId?: string): Promise<Video>;
    unpublish(videoId: string, uploaderId?: string): Promise<Video>;
    delete(videoId: string, uploaderId?: string): Promise<void>;
    update(videoId: string, updateData: Partial<CreateVideoDto>, uploaderId?: string): Promise<Video>;
}
