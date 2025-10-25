import { Stream } from './stream.entity';
export declare class User {
    id: string;
    email: string;
    displayName: string;
    photoURL: string;
    isCreator: boolean;
    isAdmin: boolean;
    firebaseUid: string;
    streams: Stream[];
    createdAt: Date;
    updatedAt: Date;
}
