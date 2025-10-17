// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ModerationModule } from '../moderation/moderation.module';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    FirebaseModule,     // Import FirebaseModule to use FirebaseService
    ModerationModule,   // Import ModerationModule to use ModerationService
  ],
  providers: [ChatService],
})
export class ChatModule {}