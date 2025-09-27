// apps/rtmps-server/src/queue/queue.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VideoProcessor } from './video.processor';
// We will create these modules next
// import { VideoModule } from '../video/video.module';
// import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    // Register the queue again to make it available within this module
    BullModule.registerQueue({
      name: 'video-processing',
    }),
    // VideoModule, // To get access to VideoService for database updates
    // FirebaseModule, // To get access to FirebaseService for uploads
  ],
  providers: [VideoProcessor],
})
export class QueueModule {}