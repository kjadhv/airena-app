import { OnModuleInit } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ModerationService } from '../moderation/moderation.service';
export declare class ChatService implements OnModuleInit {
    private readonly firebaseService;
    private readonly moderationService;
    private db;
    constructor(firebaseService: FirebaseService, moderationService: ModerationService);
    onModuleInit(): void;
    private listenForNewMessages;
    private moderateMessage;
    private applySanction;
}
