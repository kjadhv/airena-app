import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NmsService } from './nms/nms.service';
import { MetricsModule } from './metrics/metric.module';
import { StreamModule } from './stream/stream.module';
import { User } from './stream/user.entity';
import { Stream } from './stream/stream.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    // Database configuration is now loaded async from env variables
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: configService.get<string>('DATABASE_PATH', 'data/streaming.db'),
        entities: [Stream, User],
        synchronize: configService.get<string>('NODE_ENV') !== 'production', // Use synchronize only in dev
      }),
    }),
    StreamModule, // This module provides StreamService
    MetricsModule,
  ],
  providers: [NmsService],
  exports: [NmsService],
})
export class AppModule {}