import { User } from '../stream/user.entity';
export declare enum VideoStatus {
    PRIVATE = "private",
    PUBLIC = "public"
}
export declare class Video {
    id: string;
    title: string;
    streamKey: string;
    hlsUrl: string;
    thumbnailUrl: string;
    status: VideoStatus;
    uploaderId?: string;
    uploader?: User;
    createdAt: Date;
}
