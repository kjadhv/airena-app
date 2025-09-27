// apps/rtmps-server/src/firebase/firebase.service.ts

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private bucket: any; // Using any since Bucket type isn't exported properly
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase environment variables are not set. Please check your .env file.');
    }

    const serviceAccount = {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.projectId}.appspot.com`,
      });
    }

    this.bucket = admin.storage().bucket();
    this.logger.log('Firebase Admin SDK initialized successfully.');
  }

  async uploadDirectory(directoryPath: string, destinationPath: string): Promise<string> {
    this.logger.log(`Uploading directory ${directoryPath} to ${destinationPath}...`);
    
    // TODO: Implement actual directory upload logic
    // This is just returning a URL for now - you'll need to actually upload the files
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const files = await fs.readdir(directoryPath);
      
      for (const file of files) {
        const filePath = path.join(directoryPath, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile()) {
          const destination = `${destinationPath}/${file}`;
          await this.bucket.upload(filePath, {
            destination: destination,
            metadata: {
              cacheControl: 'public, max-age=31536000',
            },
          });
          this.logger.log(`Uploaded ${file} to ${destination}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upload directory: ${errorMessage}`);
      throw error;
    }
    
    const masterPlaylistUrl = this.bucket.file(`${destinationPath}/playlist.m3u8`).publicUrl();
    return masterPlaylistUrl;
  }

  async getFileUrl(filePath: string): Promise<string> {
    return this.bucket.file(filePath).publicUrl();
  }
}