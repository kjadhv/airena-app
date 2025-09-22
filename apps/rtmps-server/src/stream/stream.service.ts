import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Firestore, FieldValue, DocumentSnapshot } from '@google-cloud/firestore';
import { Bucket } from '@google-cloud/storage';
import { MetricService } from '../metrics/metric.service';
import * as fs from 'fs';

// The UserStream interface is now defined directly in this file.
export interface UserStream {
  id?: string;
  firebaseId: string;
  streamKey: string;
  streamUrl: string;
  isStreaming: boolean;
  streamSettings?: Record<string, any>;
  createdAt?: FieldValue;
  updatedAt?: FieldValue;
}

@Injectable()
export class StreamService {
  private readonly rtmpServerUrl: string;
  private readonly hlsServerUrl: string;
  private readonly usersCollection;
  private readonly streamsCollection;

  constructor(
    @Inject('FIRESTORE') private readonly firestore: Firestore,
    @Inject('STORAGE_BUCKET') private readonly storageBucket: Bucket,
    private readonly configService: ConfigService,
    private readonly metricService: MetricService,
  ) {
    // --- THIS IS THE FIX for the OBS connection error ---
    // The port is changed from 1935 to 1936 to match your NmsService.
    this.rtmpServerUrl = this.configService.get<string>('RTMP_BASE_URL', 'rtmp://localhost:1936');
    // ---------------------------------------------------
    this.hlsServerUrl = this.configService.get<string>('HLS_BASE_URL', 'http://localhost:8001');
    this.usersCollection = this.firestore.collection('users');
    this.streamsCollection = this.firestore.collection('streams');
  }
  
  async saveFinishedStream(streamKey: string, videoPath: string) {
    const userDoc = await this._getUserDocByStreamKey(streamKey);
    if (!userDoc) {
      console.error(`No user found for stream key ${streamKey}, cannot save video.`);
      fs.unlink(videoPath, () => {}); // Clean up file even if user is not found
      return;
    }

    const userData = userDoc.data() as UserStream;
    const destination = `streams/${userData.firebaseId}/${Date.now()}.mp4`;

    try {
      const [file] = await this.storageBucket.upload(videoPath, { destination });
      await file.makePublic();
      const publicUrl = file.publicUrl();

      await this.streamsCollection.add({
        firebaseId: userData.firebaseId,
        streamKey: streamKey,
        playbackUrl: publicUrl,
        storagePath: destination,
        title: 'Untitled Stream',
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(`Successfully uploaded ${videoPath} to ${publicUrl}`);
      
      fs.unlink(videoPath, (err) => {
        if (err) console.error(`Failed to delete local file ${videoPath}:`, err);
        else console.log(`Deleted local file ${videoPath}`);
      });

    } catch (error) {
      console.error('Failed to upload and save stream:', error);
    }
  }

  async getOrCreateStreamKey(firebaseId: string) {
    const userDoc = await this._getUserDocByFirebaseId(firebaseId);

    if (userDoc) {
      const userData = userDoc.data() as UserStream;
      return {
        ...userData,
        hlsUrl: this.generateHlsUrl(userData.streamKey),
      };
    }

    const streamKey = this.generateStreamKey();
    const newUserStream: UserStream = {
      firebaseId,
      streamKey,
      streamUrl: this.generateStreamUrl(streamKey),
      isStreaming: false,
      streamSettings: { resolution: '1920x1080' },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await this.usersCollection.add(newUserStream);
    const createdData = (await docRef.get()).data() as UserStream;

    return {
      ...createdData,
      hlsUrl: this.generateHlsUrl(createdData.streamKey),
    };
  }
  
  async regenerateStreamKey(firebaseId: string) {
    const userDoc = await this._getUserDocByFirebaseId(firebaseId);
    if (!userDoc) throw new NotFoundException('User not found.');

    const newStreamKey = this.generateStreamKey();
    const newStreamUrl = this.generateStreamUrl(newStreamKey);

    await userDoc.ref.update({
      streamKey: newStreamKey,
      streamUrl: newStreamUrl,
      isStreaming: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      message: 'Stream key regenerated successfully.',
      streamKey: newStreamKey,
      streamUrl: newStreamUrl,
      hlsUrl: this.generateHlsUrl(newStreamKey),
    };
  }

  async updateStreamSettings(firebaseId: string, settings: Record<string, any>) {
    const userDoc = await this._getUserDocByFirebaseId(firebaseId);
    if (!userDoc) throw new NotFoundException('User not found.');

    const userData = userDoc.data();
    if (!userData) throw new NotFoundException('User data could not be read.');

    const currentSettings = userData.streamSettings || {};
    const updatedSettings = { ...currentSettings, ...settings };

    await userDoc.ref.update({
      streamSettings: updatedSettings,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: 'Stream settings updated successfully',
      settings: updatedSettings,
    };
  }

  async startStream(streamKey: string) {
    const userDoc = await this._getUserDocByStreamKey(streamKey);
    if (!userDoc) throw new NotFoundException('Invalid stream key.');

    await userDoc.ref.update({ isStreaming: true, updatedAt: FieldValue.serverTimestamp() });
    return { success: true, message: 'Stream started.' };
  }

  async stopStream(streamKey: string) {
    const userDoc = await this._getUserDocByStreamKey(streamKey);
    if (!userDoc) throw new NotFoundException('Invalid stream key.');
    
    await userDoc.ref.update({ isStreaming: false, updatedAt: FieldValue.serverTimestamp() });
    return { success: true, message: 'Stream stopped.' };
  }
  
  async getStreamDetails(streamKey: string) {
    const userDoc = await this._getUserDocByStreamKey(streamKey);
    if (!userDoc) throw new NotFoundException('Stream not found.');
    
    const userData = userDoc.data() as UserStream;
    const metrics = await this.metricService.getMetrics(streamKey);

    return {
      streamKey: userData.streamKey,
      isLive: userData.isStreaming,
      hlsUrl: this.generateHlsUrl(streamKey),
      settings: userData.streamSettings,
      metrics: {
        bitrate: metrics?.bitrate ?? 0,
        latency: metrics?.latency ?? 0,
      },
    };
  }

  private async _getUserDocByFirebaseId(firebaseId: string): Promise<DocumentSnapshot | null> {
    const snapshot = await this.usersCollection.where('firebaseId', '==', firebaseId).limit(1).get();
    return snapshot.empty ? null : snapshot.docs[0];
  }

  private async _getUserDocByStreamKey(streamKey: string): Promise<DocumentSnapshot | null> {
    const snapshot = await this.usersCollection.where('streamKey', '==', streamKey).limit(1).get();
    return snapshot.empty ? null : snapshot.docs[0];
  }

  private generateStreamKey = (): string => randomBytes(16).toString('hex');
  private generateStreamUrl = (streamKey: string): string => `${this.rtmpServerUrl}/live/${streamKey}`;
  private generateHlsUrl = (streamKey: string): string => `${this.hlsServerUrl}/live/${streamKey}/index.m3u8`;
}
