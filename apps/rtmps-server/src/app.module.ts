// apps/rtmps-server/src/app.module.ts

import { Module, Logger } from '@nestjs/common'; // Import Logger
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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // Make sure this .env file is in the SAME directory as your running application
    }),

    // --- DATABASE CONFIGURATION (PostgreSQL) ---
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('DATABASE_URL');
        
        // --- DEBUGGING LINE ---
        Logger.log(`[AppModule] Attempting to connect to Database with URL: ${dbUrl}`, 'Database');
        
        if (!dbUrl) {
          Logger.error('[AppModule] FATAL: DATABASE_URL is not set!', 'Database');
        }

        return {
          type: 'postgres',
          url: dbUrl,
          autoLoadEntities: true,
          synchronize: true, // For development only. Use migrations in production.
        };
      },
    }),

    // --- BACKGROUND JOB QUEUE CONFIGURATION (BullMQ + Redis) ---
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST');
        const redisPort = parseInt(configService.get('REDIS_PORT', '6379'));
        const redisPassword = configService.get('REDIS_PASSWORD'); // ← ADDED
        
        // --- DEBUGGING LINES ---
        Logger.log(`[AppModule] Attempting to connect to Redis at Host: ${redisHost}, Port: ${redisPort}`, 'Redis');
        
        if (redisPassword) {
          Logger.log(`[AppModule] Redis password is configured`, 'Redis');
        } else {
          Logger.warn(`[AppModule] Redis password is NOT configured - using passwordless connection`, 'Redis');
        }

        if (!redisHost) {
          Logger.error('[AppModule] FATAL: REDIS_HOST is not set!', 'Redis');
        }

        return {
          connection: {
            host: redisHost,
            port: redisPort,
            password: redisPassword, // ← ADDED - will be undefined if not set, which is fine
          },
        };
      },
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