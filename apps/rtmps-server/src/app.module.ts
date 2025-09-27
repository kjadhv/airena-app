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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        url: configService.get<string>('DATABASE_URL'),
        entities: [Stream, User],
        // MODIFIED: Kept synchronize: true for testing purposes
        synchronize: true, 
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    }),
    StreamModule,
    MetricsModule,
  ],
  providers: [NmsService],
  exports: [NmsService],
})
export class AppModule {}