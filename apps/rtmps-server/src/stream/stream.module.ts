import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StreamController } from './stream.controller';
import { StreamService } from './stream.service';
import { Stream } from './stream.entity';
import { User } from './user.entity';
import { VideoModule } from '../video/video.module';
import { VodProcessorModule } from '../vod-processor/vod-processor.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Stream, User]),
    VideoModule,
    VodProcessorModule,
  ],
  controllers: [StreamController],
  providers: [StreamService],
  exports: [StreamService]
})
export class StreamModule {}