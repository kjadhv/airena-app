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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const video_entity_1 = require("./video.entity");
let VideoService = class VideoService {
    constructor(videoRepository) {
        this.videoRepository = videoRepository;
    }
    create(videoData) {
        return __awaiter(this, void 0, void 0, function* () {
            const newVideo = this.videoRepository.create({
                title: videoData.title,
                streamKey: videoData.streamKey,
                hlsUrl: videoData.hlsUrl,
                thumbnailUrl: videoData.thumbnailUrl,
            });
            return this.videoRepository.save(newVideo);
        });
    }
    createWithUploader(videoData, uploaderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const newVideo = this.videoRepository.create({
                title: videoData.title,
                streamKey: videoData.streamKey,
                hlsUrl: videoData.hlsUrl,
                thumbnailUrl: videoData.thumbnailUrl,
                uploaderId: uploaderId,
            });
            return this.videoRepository.save(newVideo);
        });
    }
    findByUserId(uploaderId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.videoRepository.find({
                where: { uploaderId: uploaderId },
                order: { createdAt: 'DESC' },
            });
        });
    }
    findAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.videoRepository.find({
                order: { createdAt: 'DESC' },
            });
        });
    }
    findAllPublic() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.videoRepository.find({
                where: { status: video_entity_1.VideoStatus.PUBLIC },
                order: { createdAt: 'DESC' },
            });
        });
    }
    findPublicById(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.videoRepository.findOne({
                where: { id: videoId, status: video_entity_1.VideoStatus.PUBLIC }
            });
        });
    }
    findById(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.videoRepository.findOne({
                where: { id: videoId }
            });
        });
    }
    findByStreamKey(streamKey) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.videoRepository.find({
                where: { streamKey },
                order: { createdAt: 'DESC' },
            });
        });
    }
    publish(videoId, uploaderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const video = yield this.videoRepository.findOne({
                where: { id: videoId },
            });
            if (!video) {
                throw new common_1.NotFoundException('Video not found');
            }
            if (uploaderId && video.uploaderId && video.uploaderId !== uploaderId) {
                throw new common_1.UnauthorizedException('You are not authorized to publish this video');
            }
            if (video.status === video_entity_1.VideoStatus.PUBLIC) {
                return video;
            }
            video.status = video_entity_1.VideoStatus.PUBLIC;
            return this.videoRepository.save(video);
        });
    }
    unpublish(videoId, uploaderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const video = yield this.videoRepository.findOne({
                where: { id: videoId },
            });
            if (!video) {
                throw new common_1.NotFoundException('Video not found');
            }
            if (uploaderId && video.uploaderId && video.uploaderId !== uploaderId) {
                throw new common_1.UnauthorizedException('You are not authorized to unpublish this video');
            }
            if (video.status === video_entity_1.VideoStatus.PRIVATE) {
                return video;
            }
            video.status = video_entity_1.VideoStatus.PRIVATE;
            return this.videoRepository.save(video);
        });
    }
    delete(videoId, uploaderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const video = yield this.videoRepository.findOne({
                where: { id: videoId },
            });
            if (!video) {
                throw new common_1.NotFoundException('Video not found');
            }
            if (uploaderId && video.uploaderId && video.uploaderId !== uploaderId) {
                throw new common_1.UnauthorizedException('You are not authorized to delete this video');
            }
            yield this.videoRepository.delete(videoId);
        });
    }
    update(videoId, updateData, uploaderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const video = yield this.videoRepository.findOne({
                where: { id: videoId },
            });
            if (!video) {
                throw new common_1.NotFoundException('Video not found');
            }
            if (uploaderId && video.uploaderId && video.uploaderId !== uploaderId) {
                throw new common_1.UnauthorizedException('You are not authorized to update this video');
            }
            Object.assign(video, updateData);
            return this.videoRepository.save(video);
        });
    }
};
exports.VideoService = VideoService;
exports.VideoService = VideoService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(video_entity_1.Video)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], VideoService);
//# sourceMappingURL=video.service.js.map