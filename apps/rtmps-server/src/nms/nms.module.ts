import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NmsService } from './nms.service';
import { StreamModule } from '../stream/stream.module';
import { HttpModule } from '@nestjs/axios'; // <-- 1. Import HttpModule

@Module({
  imports: [
    HttpModule.register({ // <-- 2. Register HttpModule with optional config
      timeout: 5000, // 5 second timeout for API calls
      maxRedirects: 5,
    }),
    BullModule.registerQueue({
      name: 'video-processing',
    }),
    StreamModule,
  ],
  providers: [NmsService],
  exports: [NmsService],
})
export class NmsModule {}