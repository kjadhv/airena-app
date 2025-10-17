// src/chat/chat.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ModerationService } from '../moderation/moderation.service';
import * as admin from 'firebase-admin';

@Injectable()
export class ChatService implements OnModuleInit {
  private db!: admin.firestore.Firestore;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly moderationService: ModerationService,
  ) {}

  onModuleInit() {
    this.db = this.firebaseService.getFirestore();
    this.listenForNewMessages();
    console.log('ChatService initialized and listening for new messages.');
  }

  private listenForNewMessages() {
    const query = this.db.collectionGroup('messages').where('status', '==', 'pending');

    query.onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          console.log(`New pending message detected: ${change.doc.id}`);
          const messageData = change.doc.data();
          const messageRef = change.doc.ref;
          this.moderateMessage(messageRef, messageData);
        }
      });
    }, err => {
        console.error('Error in onSnapshot listener:', err);
    });
  }

  private async moderateMessage(
    docRef: admin.firestore.DocumentReference,
    message: admin.firestore.DocumentData,
  ) {
    const { text, authorId } = message;

    const userDoc = await this.db.collection('users').doc(authorId).get();
    
    if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData) {
            if (userData.isBanned || (userData.isMuted && userData.muteUntil?.toDate() > new Date())) {
                console.log(`Deleting message from muted/banned user: ${authorId}`);
                return docRef.delete();
            }
        }
    }

    // --- ⬇️ THIS SECTION IS UPDATED ⬇️ ---
    // The multi-step toxicity check is replaced with a single call to the new service method.
    if (await this.moderationService.isToxic(text)) {
      console.log(`Message ${docRef.id} rejected by OpenAI moderation.`);
      await this.applySanction(authorId);
      return docRef.update({ status: 'rejected', text: 'This message was blocked by moderation.' });
    }
    // --- ⬆️ END OF UPDATE ⬆️ ---

    // The basic profanity filter can act as a backup.
    if (this.moderationService.isProfane(text)) {
        console.log(`Message ${docRef.id} rejected for profanity.`);
        return docRef.update({ status: 'rejected', text: 'This message contains blocked words.' });
    }

    console.log(`Approving message ${docRef.id}`);
    await docRef.update({ status: 'approved' });
  }

  private async applySanction(userId: string) {
    console.log(`Applying automated sanction to user: ${userId}`);
    // Future logic for a strikes system can go here.
  }
}