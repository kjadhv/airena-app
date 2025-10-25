import { StreamService, StreamCredentials, LiveStreamDto } from "./stream.service";
interface StreamDetailsDto {
    userId: string;
    email: string;
    displayName: string;
    title: string;
    description: string;
}
interface StreamStatusHookDto {
    streamKey: string;
    isActive: boolean;
}
export declare class StreamController {
    private readonly streamService;
    private readonly logger;
    constructor(streamService: StreamService);
    getLiveStreams(): Promise<LiveStreamDto[]>;
    getExistingCredentials(userId: string): Promise<(import("./stream.entity").Stream & StreamCredentials) | {
        exists: boolean;
    }>;
    getStreamCredentials(detailsDto: StreamDetailsDto, file: Express.Multer.File): Promise<StreamCredentials>;
    updateStreamStatusFromHook(hookDto: StreamStatusHookDto): Promise<void>;
    regenerateStreamKey(userId: string): Promise<StreamCredentials>;
    getStreamStatus(streamKey: string): Promise<{
        isActive: boolean;
        title: string | undefined;
        authorName: string;
    }>;
}
export {};
