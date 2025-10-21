// apps/rtmps-server/src/video/video.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { Video } from './video.entity';
import { FirebaseModule } from '../firebase/firebase.module';
import { VodProcessorModule } from '../vod-processor/vod-processor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Video]),
    FirebaseModule,
    forwardRef(() => VodProcessorModule), // Use forwardRef to resolve circular dependency
  ],
  controllers: [VideoController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}