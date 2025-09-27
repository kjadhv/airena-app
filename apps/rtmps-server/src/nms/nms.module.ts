// apps/rtmps-server/src/nms/nms.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NmsService } from './nms.service';
import { StreamModule } from '../stream/stream.module';

@Module({
  imports: [
    // Make the 'video-processing' queue available to be injected into NmsService
    BullModule.registerQueue({
      name: 'video-processing',
    }),
    // Import the StreamModule to make StreamService available
    StreamModule,
  ],
  providers: [NmsService],
  exports: [NmsService],
})
export class NmsModule {}