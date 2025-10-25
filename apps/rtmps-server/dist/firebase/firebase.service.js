"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
var FirebaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseService = void 0;
const common_1 = require("@nestjs/common");
const admin = __importStar(require("firebase-admin"));
const config_1 = require("@nestjs/config");
let FirebaseService = FirebaseService_1 = class FirebaseService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(FirebaseService_1.name);
        const projectId = this.configService.get('FIREBASE_PROJECT_ID');
        const clientEmail = this.configService.get('FIREBASE_CLIENT_EMAIL');
        const privateKey = this.configService.get('FIREBASE_PRIVATE_KEY');
        if (!projectId || !clientEmail || !privateKey) {
            throw new Error('Firebase environment variables are not set. Please check your .env file.');
        }
        const serviceAccount = {
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
        };
        if (!admin.apps.length) {
            this.app = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: `${serviceAccount.projectId}.appspot.com`,
            });
        }
        else {
            this.app = admin.app();
        }
    }
    onModuleInit() {
        this.bucket = this.app.storage().bucket();
        this.logger.log('Firebase Admin SDK initialized successfully.');
    }
    getFirestore() {
        if (!this.app) {
            throw new Error('Firebase app is not initialized');
        }
        return this.app.firestore();
    }
    getAuth() {
        if (!this.app) {
            throw new Error('Firebase app is not initialized');
        }
        return this.app.auth();
    }
    uploadDirectory(directoryPath, destinationPath) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.log(`Uploading directory ${directoryPath} to ${destinationPath}...`);
            const fs = require('fs').promises;
            const path = require('path');
            try {
                const files = yield fs.readdir(directoryPath);
                for (const file of files) {
                    const filePath = path.join(directoryPath, file);
                    const stat = yield fs.stat(filePath);
                    if (stat.isFile()) {
                        const destination = `${destinationPath}/${file}`;
                        yield this.bucket.upload(filePath, {
                            destination: destination,
                            metadata: {
                                cacheControl: 'public, max-age=31536000',
                            },
                        });
                        this.logger.log(`Uploaded ${file} to ${destination}`);
                    }
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed to upload directory: ${errorMessage}`);
                throw error;
            }
            const masterPlaylistUrl = this.bucket.file(`${destinationPath}/playlist.m3u8`).publicUrl();
            return masterPlaylistUrl;
        });
    }
    getFileUrl(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.bucket.file(filePath).publicUrl();
        });
    }
};
exports.FirebaseService = FirebaseService;
exports.FirebaseService = FirebaseService = FirebaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FirebaseService);
//# sourceMappingURL=firebase.service.js.map