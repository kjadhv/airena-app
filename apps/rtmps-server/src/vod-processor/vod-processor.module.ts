import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VodProcessorService } from './vod-processor.service';
import { VideoModule } from '../video/video.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => VideoModule), // Use forwardRef to resolve circular dependency
  ],
  providers: [VodProcessorService],
  exports: [VodProcessorService],
})
export class VodProcessorModule {}