"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const firebase_service_1 = require("../firebase/firebase.service");
const moderation_service_1 = require("../moderation/moderation.service");
let ChatService = class ChatService {
    constructor(firebaseService, moderationService) {
        this.firebaseService = firebaseService;
        this.moderationService = moderationService;
    }
    onModuleInit() {
        this.db = this.firebaseService.getFirestore();
        this.listenForNewMessages();
        console.log('ChatService initialized and listening for new messages.');
    }
    listenForNewMessages() {
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
    moderateMessage(docRef, message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { text, authorId } = message;
            const userDoc = yield this.db.collection('users').doc(authorId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData) {
                    if (userData.isBanned || (userData.isMuted && ((_a = userData.muteUntil) === null || _a === void 0 ? void 0 : _a.toDate()) > new Date())) {
                        console.log(`Deleting message from muted/banned user: ${authorId}`);
                        return docRef.delete();
                    }
                }
            }
            if (yield this.moderationService.isToxic(text)) {
                console.log(`Message ${docRef.id} rejected by OpenAI moderation.`);
                yield this.applySanction(authorId);
                return docRef.update({ status: 'rejected', text: 'This message was blocked by moderation.' });
            }
            if (this.moderationService.isProfane(text)) {
                console.log(`Message ${docRef.id} rejected for profanity.`);
                return docRef.update({ status: 'rejected', text: 'This message contains blocked words.' });
            }
            console.log(`Approving message ${docRef.id}`);
            yield docRef.update({ status: 'approved' });
        });
    }
    applySanction(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Applying automated sanction to user: ${userId}`);
        });
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService,
        moderation_service_1.ModerationService])
], ChatService);
//# sourceMappingURL=chat.service.js.map