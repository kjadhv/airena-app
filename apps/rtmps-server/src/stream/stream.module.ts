import { Module, InternalServerErrorException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';
import { MetricsModule } from '../metrics/metric.module';

// --- Provider #1: Initializes the Firebase App ---
const firebaseProvider = {
  provide: 'FIREBASE_APP',
  useFactory: (configService: ConfigService) => {
    const serviceAccount = {
      projectId: configService.get<string>('FIREBASE_PROJECT_ID'),
      clientEmail: configService.get<string>('FIREBASE_CLIENT_EMAIL'),
      privateKey: configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
    };
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new InternalServerErrorException('Firebase credentials are not configured in .env.local');
    }
    if (admin.apps.length === 0) {
      return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    return admin.app();
  },
  inject: [ConfigService],
};

// --- Provider #2: Provides Firestore, depends on the Firebase App ---
const firestoreProvider = {
  provide: 'FIRESTORE',
  useFactory: (app: admin.app.App) => app.firestore(),
  inject: ['FIREBASE_APP'], // Explicitly depend on the initialized app
};

// --- Provider #3: Provides Storage, depends on the Firebase App ---
const storageProvider = {
  provide: 'STORAGE_BUCKET',
  useFactory: (app: admin.app.App, configService: ConfigService) => {
    const bucketName = `${configService.get<string>('FIREBASE_PROJECT_ID')}.appspot.com`;
    return app.storage().bucket(bucketName);
  },
  inject: ['FIREBASE_APP', ConfigService], // Explicitly depend on the initialized app
};

@Module({
  imports: [ConfigModule, MetricsModule],
  providers: [
    firebaseProvider,
    firestoreProvider,
    storageProvider,
    StreamService,
  ],
  controllers: [StreamController],
  exports: [StreamService], // 👈 This line makes the StreamService available to other modules
})
export class StreamModule {}