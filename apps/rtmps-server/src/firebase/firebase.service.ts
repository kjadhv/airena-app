// apps/rtmps-server/src/firebase/firebase.service.ts

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { Bucket } from '@google-cloud/storage';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: admin.app.App; 
  private bucket!: Bucket;
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private readonly configService: ConfigService) {
    // Initialize Firebase in constructor instead of onModuleInit
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
      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.projectId}.appspot.com`,
      });
    } else {
      this.app = admin.app();
    }
  }

  onModuleInit() {
    this.bucket = this.app.storage().bucket();
    this.logger.log('Firebase Admin SDK initialized successfully.');
  }
  
  getFirestore(): admin.firestore.Firestore {
    if (!this.app) {
      throw new Error('Firebase app is not initialized');
    }
    return this.app.firestore();
  }

  getAuth(): admin.auth.Auth {
    if (!this.app) {
      throw new Error('Firebase app is not initialized');
    }
    return this.app.auth();
  }

  async uploadDirectory(directoryPath: string, destinationPath: string): Promise<string> {
    this.logger.log(`Uploading directory ${directoryPath} to ${destinationPath}...`);
    
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