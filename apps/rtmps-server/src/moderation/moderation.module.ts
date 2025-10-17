// src/moderation/moderation.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; //
import { ModerationService } from './moderation.service';

@Module({
  imports: [HttpModule], // 
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}