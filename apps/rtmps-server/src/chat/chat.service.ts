// src/chat/chat.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ModerationService } from '../moderation/moderation.service';
import * as admin from 'firebase-admin';

@Injectable()
export class ChatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatService.name);
  private db!: admin.firestore.Firestore;
  private unsubscribe?: () => void;
  private initializationAttempts = 0;
  private readonly maxRetries = 5;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly moderationService: ModerationService,
  ) {}

  async onModuleInit() {
    this.initializationAttempts++;
    
    try {
      // Wait a bit for Firebase to be fully ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.db = this.firebaseService.getFirestore();
      
      // Verify connection before setting up listener
      await this.db.listCollections();
      
      this.listenForNewMessages();
      this.logger.log('✅ ChatService initialized and listening for new messages');
    } catch (error) {
      this.logger.error(`❌ Failed to initialize ChatService (attempt ${this.initializationAttempts}/${this.maxRetries}):`, error);
      
      if (this.initializationAttempts < this.maxRetries) {
        this.logger.warn(`⚠️ Retrying in ${5 * this.initializationAttempts} seconds...`);
        setTimeout(() => this.onModuleInit(), 5000 * this.initializationAttempts);
      } else {
        this.logger.error('❌ Max retry attempts reached. ChatService will not function properly.');
      }
    }
  }

  onModuleDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.logger.log('🔌 Firestore listener unsubscribed');
    }
  }

  private listenForNewMessages() {
    try {
      const query = this.db.collectionGroup('messages').where('status', '==', 'pending');

      this.unsubscribe = query.onSnapshot(
        snapshot => {
          if (snapshot.docChanges().length > 0) {
            this.logger.log(`📩 Received ${snapshot.docChanges().length} message change(s)`);
          }
          
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              this.logger.log(`🆕 New pending message detected: ${change.doc.id}`);
              const messageData = change.doc.data();
              const messageRef = change.doc.ref;
              this.moderateMessage(messageRef, messageData);
            }
          });
        },
        err => {
          this.logger.error('❌ Error in onSnapshot listener:', err);
          
          // Cleanup old listener
          if (this.unsubscribe) {
            this.unsubscribe();
          }
          
          // Retry connection after 10 seconds
          this.logger.warn('⚠️ Attempting to reconnect in 10 seconds...');
          setTimeout(() => {
            this.logger.log('🔄 Retrying Firestore listener connection...');
            this.listenForNewMessages();
          }, 10000);
        }
      );

      this.logger.log('👂 Firestore listener established successfully');
    } catch (error) {
      this.logger.error('❌ Failed to establish Firestore listener:', error);
      
      // Retry after delay
      setTimeout(() => {
        this.logger.log('🔄 Retrying to establish Firestore listener...');
        this.listenForNewMessages();
      }, 10000);
    }
  }

  private async moderateMessage(
    docRef: admin.firestore.DocumentReference,
    message: admin.firestore.DocumentData,
  ) {
    try {
      const { text, authorId } = message;

      // Check if user is banned or muted
      const userDoc = await this.db.collection('users').doc(authorId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData) {
          if (userData.isBanned || (userData.isMuted && userData.muteUntil?.toDate() > new Date())) {
            this.logger.log(`🚫 Deleting message from muted/banned user: ${authorId}`);
            return docRef.delete();
          }
        }
      }

      // Check for toxicity using OpenAI moderation
      if (await this.moderationService.isToxic(text)) {
        this.logger.log(`⛔ Message ${docRef.id} rejected by OpenAI moderation`);
        await this.applySanction(authorId);
        return docRef.update({ 
          status: 'rejected', 
          text: 'This message was blocked by moderation.' 
        });
      }

      // Backup profanity filter
      if (this.moderationService.isProfane(text)) {
        this.logger.log(`🔞 Message ${docRef.id} rejected for profanity`);
        return docRef.update({ 
          status: 'rejected', 
          text: 'This message contains blocked words.' 
        });
      }

      this.logger.log(`✅ Approving message ${docRef.id}`);
      await docRef.update({ status: 'approved' });
    } catch (error) {
      this.logger.error(`❌ Error moderating message ${docRef.id}:`, error);
    }
  }

  private async applySanction(userId: string) {
    this.logger.log(`⚠️ Applying automated sanction to user: ${userId}`);
    // Future logic for a strikes system can go here.
  }
}