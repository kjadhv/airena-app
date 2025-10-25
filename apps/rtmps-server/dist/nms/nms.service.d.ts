import { OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { StreamService } from '../stream/stream.service';
export declare class NmsService implements OnModuleInit {
    private readonly videoQueue;
    private readonly configService;
    private readonly streamService;
    private readonly httpService;
    private nms;
    private readonly logger;
    private readonly API_HOOK_URL;
    private readonly MEDIA_ROOT;
    constructor(videoQueue: Queue, configService: ConfigService, streamService: StreamService, httpService: HttpService);
    onModuleInit(): void;
    private notifyApiOfStreamStatus;
    private setupStreamEvents;
    private queueTranscodingJob;
}
