import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../firebase/firebase.service';
import { VideoService } from '../video/video.service';
export declare class VideoProcessor extends WorkerHost {
    private readonly configService;
    private readonly firebaseService;
    private readonly videoService;
    private readonly logger;
    constructor(configService: ConfigService, firebaseService: FirebaseService, videoService: VideoService);
    process(job: Job<any>): Promise<{
        status: string;
        hlsUrl: string;
    }>;
    private handleTranscodeHls;
}
