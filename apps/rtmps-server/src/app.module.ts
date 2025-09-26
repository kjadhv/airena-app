import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { Stream } from './stream/stream.entity';
import { User } from './stream/user.entity';

import { NmsService } from './nms/nms.service';
import { StreamService } from './stream/stream.service';

import { MetricsModule } from './metrics/metric.module';
import { StreamModule } from './stream/stream.module';



@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StreamModule,
    MetricsModule,
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'src/data/streaming.db',
      entities: [Stream, User],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Stream, User]),
  ],
  providers: [NmsService, StreamService],
  exports: [NmsService],
})
export class AppModule {}
