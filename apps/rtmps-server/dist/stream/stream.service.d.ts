import { Repository } from "typeorm";
import { Stream } from "./stream.entity";
import { User } from "./user.entity";
import { ConfigService } from "@nestjs/config";
import { VideoService } from '../video/video.service';
export interface StreamCredentials {
    streamKey: string;
    streamUrl: string;
    playbackUrl: string;
}
export interface LiveStreamDto {
    id: string;
    title: string;
    thumbnailUrl?: string;
    authorName: string;
    authorPhotoURL: string | null;
}
interface StreamDetailsDto {
    userId: string;
    email: string;
    displayName: string;
    title: string;
    description: string;
}
export declare class StreamService {
    private streamRepository;
    private userRepository;
    private configService;
    private videoService;
    private readonly logger;
    private readonly RTMP_SERVER_URL;
    private readonly HLS_BASE_URL;
    private readonly storageBucketName;
    constructor(streamRepository: Repository<Stream>, userRepository: Repository<User>, configService: ConfigService, videoService: VideoService);
    getActiveStreams(): Promise<LiveStreamDto[]>;
    getStreamCredentials(detailsDto: StreamDetailsDto, thumbnailFile: Express.Multer.File): Promise<StreamCredentials>;
    private saveThumbnailAndGetUrl;
    getExistingCredentials(firebaseUid: string): Promise<(Stream & StreamCredentials) | null>;
    regenerateStreamKey(firebaseUid: string): Promise<StreamCredentials>;
    getStreamByKey(streamKey: string): Promise<Stream | null>;
    updateStreamStatus(streamKey: string, isActive: boolean): Promise<void>;
    private createVODFromStream;
    private findOrCreateUser;
    private createStreamForUser;
    private generateStreamKey;
}
export {};
