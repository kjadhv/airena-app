import { VideoService } from './video.service';
import { VodProcessorService } from '../vod-processor/vod-processor.service';
import { Request } from 'express';
interface RequestWithUser extends Request {
    user: {
        uid: string;
        [key: string]: any;
    };
}
export declare class VideoController {
    private readonly videoService;
    private readonly vodProcessorService;
    constructor(videoService: VideoService, vodProcessorService: VodProcessorService);
    getMyVideos(req: RequestWithUser): Promise<import("./video.entity").Video[]>;
    publishVideo(videoId: string, req: RequestWithUser): Promise<import("./video.entity").Video>;
    getVideoById(videoId: string): Promise<import("./video.entity").Video>;
    getVideosByStreamKey(streamKey: string): Promise<import("./video.entity").Video[]>;
    getAllPublicVideos(): Promise<import("./video.entity").Video[]>;
    processVideo(videoId: string, req: RequestWithUser): Promise<{
        message: string;
        videoId: string;
    }>;
}
export {};
