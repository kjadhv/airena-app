import { ConfigService } from '@nestjs/config';
import { VideoService } from '../video/video.service';
import { Video } from '../video/video.entity';
export declare class VodProcessorService {
    private readonly videoService;
    private readonly configService;
    private readonly logger;
    private readonly HLS_DIRECTORY;
    private readonly VOD_OUTPUT_DIRECTORY;
    private readonly storageBucketName;
    constructor(videoService: VideoService, configService: ConfigService);
    processVOD(video: Video): Promise<void>;
    private convertHLSToMP4;
    generateThumbnail(videoPath: string, streamKey: string): Promise<string>;
    private uploadToStorage;
    private cleanupTempFiles;
    private cleanupLocalFiles;
}
