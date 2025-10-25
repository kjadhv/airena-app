import { User } from "./user.entity";
export declare class Stream {
    id: string;
    streamKey: string;
    streamUrl: string;
    userId: string;
    user: User;
    isActive: boolean;
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    lastActiveAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
