// apps/rtmps-server/src/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VideoProcessor } from './video.processor';
import { FirebaseModule } from '../firebase/firebase.module';
import { VideoModule } from '../video/video.module';

@Module({
  imports: [
    ConfigModule, // Add ConfigModule for ConfigService
    FirebaseModule, 
    VideoModule,
    BullModule.registerQueueAsync({
      name: 'video-processing',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [VideoProcessor],
  exports: [BullModule], // Export BullModule so other modules can inject queues
})
export class QueueModule {}