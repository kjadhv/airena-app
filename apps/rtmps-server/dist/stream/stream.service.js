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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
var StreamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const stream_entity_1 = require("./stream.entity");
const user_entity_1 = require("./user.entity");
const crypto_1 = require("crypto");
const config_1 = require("@nestjs/config");
const storage_1 = require("firebase-admin/storage");
const path = __importStar(require("path"));
const video_service_1 = require("../video/video.service");
let StreamService = StreamService_1 = class StreamService {
    constructor(streamRepository, userRepository, configService, videoService) {
        this.streamRepository = streamRepository;
        this.userRepository = userRepository;
        this.configService = configService;
        this.videoService = videoService;
        this.logger = new common_1.Logger(StreamService_1.name);
        this.RTMP_SERVER_URL = this.configService.get("RTMP_SERVER_URL", "rtmp://localhost:1935/live");
        this.HLS_BASE_URL = this.configService.get("HLS_BASE_URL", "http://localhost:8000/live");
        const bucketName = this.configService.get("FIREBASE_STORAGE_BUCKET");
        if (!bucketName) {
            throw new Error("FIREBASE_STORAGE_BUCKET environment variable not set.");
        }
        this.storageBucketName = bucketName;
        this.logger.log(`Firebase Storage bucket configured: ${this.storageBucketName}`);
    }
    getActiveStreams() {
        return __awaiter(this, void 0, void 0, function* () {
            const streams = yield this.streamRepository.find({
                where: { isActive: true }, relations: ["user"], order: { lastActiveAt: 'DESC' }
            });
            return streams.map((stream) => {
                var _a, _b;
                return ({
                    id: stream.id,
                    title: stream.title || "Untitled Stream",
                    thumbnailUrl: stream.thumbnailUrl || `https://placehold.co/1600x900/000000/FFFFFF?text=${encodeURIComponent(stream.title || 'Live')}`,
                    authorName: ((_a = stream.user) === null || _a === void 0 ? void 0 : _a.displayName) || "Unknown Streamer",
                    authorPhotoURL: ((_b = stream.user) === null || _b === void 0 ? void 0 : _b.photoURL) || null,
                });
            });
        });
    }
    getStreamCredentials(detailsDto, thumbnailFile) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.findOrCreateUser(detailsDto);
            let stream = yield this.streamRepository.findOne({ where: { userId: user.id } });
            if (!stream) {
                stream = yield this.createStreamForUser(user);
            }
            let thumbnailUrl = '';
            try {
                thumbnailUrl = yield this.saveThumbnailAndGetUrl(thumbnailFile, stream.streamKey);
                this.logger.log(`Thumbnail uploaded successfully: ${thumbnailUrl}`);
            }
            catch (error) {
                this.logger.error(`Thumbnail upload failed, using placeholder`, error.message);
                thumbnailUrl = `https://placehold.co/1600x900/000000/FFFFFF?text=${encodeURIComponent(detailsDto.title || 'Stream')}`;
            }
            stream.title = detailsDto.title;
            stream.description = detailsDto.description;
            stream.thumbnailUrl = thumbnailUrl;
            yield this.streamRepository.save(stream);
            return {
                streamKey: stream.streamKey,
                streamUrl: `${this.RTMP_SERVER_URL}`,
                playbackUrl: `${this.HLS_BASE_URL}/${stream.streamKey}/index.m3u8`,
            };
        });
    }
    saveThumbnailAndGetUrl(file, streamKey) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!file) {
                this.logger.warn('No file provided for thumbnail upload');
                return '';
            }
            this.logger.log(`Starting thumbnail upload for stream ${streamKey}`);
            this.logger.log(`File size: ${file.size} bytes, mimetype: ${file.mimetype}`);
            this.logger.log(`Target bucket: ${this.storageBucketName}`);
            try {
                const bucket = (0, storage_1.getStorage)().bucket();
                this.logger.log(`Bucket obtained, checking if it exists...`);
                const [exists] = yield bucket.exists();
                if (!exists) {
                    throw new Error(`Storage bucket does not exist or is not accessible. Check your FIREBASE_STORAGE_BUCKET environment variable.`);
                }
                this.logger.log(`Bucket exists and is accessible`);
                const fileExtension = path.extname(file.originalname) || '.jpg';
                const fileName = `thumbnails/${streamKey}${fileExtension}`;
                const fileUpload = bucket.file(fileName);
                this.logger.log(`Uploading to: ${fileName}`);
                yield fileUpload.save(file.buffer, {
                    metadata: {
                        contentType: file.mimetype,
                    },
                    public: true,
                    validation: false,
                });
                this.logger.log(`File uploaded, making it public...`);
                yield fileUpload.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                this.logger.log(`Thumbnail uploaded successfully: ${publicUrl}`);
                return publicUrl;
            }
            catch (error) {
                this.logger.error(`Failed to upload thumbnail for stream ${streamKey}`);
                this.logger.error(`Error message: ${error.message}`);
                this.logger.error(`Error code: ${error.code}`);
                if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('does not exist')) {
                    this.logger.error(`BUCKET NOT FOUND! Current bucket name: ${this.storageBucketName}`);
                    this.logger.error(`Please verify this bucket name exists in Firebase Console -> Storage`);
                }
                throw error;
            }
        });
    }
    getExistingCredentials(firebaseUid) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.log(`Looking for user with firebaseUid: ${firebaseUid}`);
            const user = yield this.userRepository.findOne({ where: { firebaseUid } });
            if (!user) {
                this.logger.warn(`No user found with firebaseUid: ${firebaseUid}`);
                return null;
            }
            this.logger.log(`Found user: ${user.id}, email: ${user.email}, looking for stream...`);
            const stream = yield this.streamRepository.findOne({
                where: { userId: user.id }, relations: ['user']
            });
            if (!stream) {
                this.logger.warn(`No stream found for userId: ${user.id}`);
                return null;
            }
            this.logger.log(`Found stream with key: ${stream.streamKey}`);
            return Object.assign(Object.assign({}, stream), { streamKey: stream.streamKey, streamUrl: `${this.RTMP_SERVER_URL}`, playbackUrl: `${this.HLS_BASE_URL}/${stream.streamKey}/index.m3u8` });
        });
    }
    regenerateStreamKey(firebaseUid) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepository.findOne({ where: { firebaseUid } });
            if (!user)
                throw new common_1.NotFoundException("User not found.");
            const stream = yield this.streamRepository.findOne({ where: { userId: user.id } });
            if (!stream)
                throw new common_1.NotFoundException("Stream not found for the user.");
            stream.streamKey = this.generateStreamKey();
            stream.isActive = false;
            yield this.streamRepository.save(stream);
            return {
                streamKey: stream.streamKey,
                streamUrl: `${this.RTMP_SERVER_URL}`,
                playbackUrl: `${this.HLS_BASE_URL}/${stream.streamKey}/index.m3u8`,
            };
        });
    }
    getStreamByKey(streamKey) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.streamRepository.findOne({ where: { streamKey }, relations: ["user"] });
        });
    }
    updateStreamStatus(streamKey, isActive) {
        return __awaiter(this, void 0, void 0, function* () {
            const stream = yield this.streamRepository.findOne({
                where: { streamKey },
                relations: ["user"]
            });
            if (!stream) {
                this.logger.warn(`Stream not found for key ${streamKey}`);
                return;
            }
            const wasActive = stream.isActive;
            stream.isActive = isActive;
            if (isActive) {
                stream.lastActiveAt = new Date();
                this.logger.log(`Stream ${streamKey} went LIVE`);
            }
            else if (wasActive && !isActive) {
                this.logger.log(`Stream ${streamKey} ended - creating VOD`);
                yield this.createVODFromStream(stream);
            }
            yield this.streamRepository.save(stream);
        });
    }
    createVODFromStream(stream) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const vodHlsUrl = `${this.HLS_BASE_URL}/${stream.streamKey}/index.m3u8`;
                const video = yield this.videoService.createWithUploader({
                    title: stream.title || `${(_a = stream.user) === null || _a === void 0 ? void 0 : _a.displayName}'s Stream`,
                    streamKey: stream.streamKey,
                    hlsUrl: vodHlsUrl,
                    thumbnailUrl: stream.thumbnailUrl || '',
                }, stream.userId);
                this.logger.log(`VOD created successfully for stream ${stream.streamKey} with video ID ${video.id}`);
            }
            catch (error) {
                this.logger.error(`Failed to create VOD for stream ${stream.streamKey}`, error.message);
            }
        });
    }
    findOrCreateUser(userDto) {
        return __awaiter(this, void 0, void 0, function* () {
            let user = yield this.userRepository.findOne({ where: { firebaseUid: userDto.userId } });
            if (user)
                return user;
            const newUser = this.userRepository.create({
                firebaseUid: userDto.userId,
                email: userDto.email,
                displayName: userDto.displayName || "New User",
            });
            return this.userRepository.save(newUser);
        });
    }
    createStreamForUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const streamKey = this.generateStreamKey();
            const newStream = this.streamRepository.create({
                user,
                userId: user.id,
                streamKey,
                streamUrl: `${this.RTMP_SERVER_URL}`,
                title: `${user.displayName}'s Stream`,
                isActive: false,
            });
            return this.streamRepository.save(newStream);
        });
    }
    generateStreamKey() {
        return `live_${(0, crypto_1.randomBytes)(12).toString("hex")}`;
    }
};
exports.StreamService = StreamService;
exports.StreamService = StreamService = StreamService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(stream_entity_1.Stream)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService,
        video_service_1.VideoService])
], StreamService);
//# sourceMappingURL=stream.service.js.map