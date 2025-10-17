// apps/rtmps-server/src/app.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { NmsModule } from './nms/nms.module';
import { StreamModule } from './stream/stream.module';
import { MetricsModule } from './metrics/metric.module';
import { QueueModule } from './queue/queue.module';
import { VideoModule } from './video/video.module';
import { FirebaseModule } from './firebase/firebase.module';

// --- NEW MODULE IMPORTS ---
import { ModerationModule } from './moderation/moderation.module';
import { ChatModule } from './chat/chat.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    // --- CORE CONFIGURATION ---
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // --- DATABASE CONFIGURATION (PostgreSQL) ---
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true, // For development only. Use migrations in production.
      }),
    }),

    // --- BACKGROUND JOB QUEUE CONFIGURATION (BullMQ + Redis) ---
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get('REDIS_PORT', '6379')),
        },
      }),
    }),

    // --- FEATURE MODULES ---
    StreamModule,
    MetricsModule,
    NmsModule,
    QueueModule,
    VideoModule,
    FirebaseModule,

    // --- NEW COMMUNITY & MODERATION MODULES ---
    ModerationModule,
    ChatModule,
    ReportsModule,
  ],
})
export class AppModule {}