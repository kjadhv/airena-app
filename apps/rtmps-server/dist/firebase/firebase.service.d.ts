import { OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
export declare class FirebaseService implements OnModuleInit {
    private readonly configService;
    private app;
    private bucket;
    private readonly logger;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    getFirestore(): admin.firestore.Firestore;
    getAuth(): admin.auth.Auth;
    uploadDirectory(directoryPath: string, destinationPath: string): Promise<string>;
    getFileUrl(filePath: string): Promise<string>;
}
