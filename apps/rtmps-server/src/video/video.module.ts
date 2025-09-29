// apps/rtmps-server/src/video/video.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { Video } from './video.entity';
import { FirebaseModule } from '../firebase/firebase.module'; // Add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([Video]),
    FirebaseModule, // Add this line
  ],
  controllers: [VideoController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}