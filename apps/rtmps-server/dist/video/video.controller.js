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
exports.VideoController = void 0;
const common_1 = require("@nestjs/common");
const video_service_1 = require("./video.service");
const firebase_auth_guard_1 = require("../auth/firebase-auth.guard");
const vod_processor_service_1 = require("../vod-processor/vod-processor.service");
let VideoController = class VideoController {
    constructor(videoService, vodProcessorService) {
        this.videoService = videoService;
        this.vodProcessorService = vodProcessorService;
    }
    getMyVideos(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const firebaseUid = req.user.uid;
            return this.videoService.findByUserId(firebaseUid);
        });
    }
    publishVideo(videoId, req) {
        return __awaiter(this, void 0, void 0, function* () {
            const firebaseUid = req.user.uid;
            return this.videoService.publish(videoId, firebaseUid);
        });
    }
    getVideoById(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            const video = yield this.videoService.findPublicById(videoId);
            if (!video) {
                throw new common_1.NotFoundException('Video not found or is not public');
            }
            return video;
        });
    }
    getVideosByStreamKey(streamKey) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.videoService.findByStreamKey(streamKey);
        });
    }
    getAllPublicVideos() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.videoService.findAllPublic();
        });
    }
    processVideo(videoId, req) {
        return __awaiter(this, void 0, void 0, function* () {
            const video = yield this.videoService.findById(videoId);
            if (!video) {
                throw new common_1.NotFoundException('Video not found');
            }
            if (video.uploaderId !== req.user.uid) {
                throw new common_1.NotFoundException('Video not found');
            }
            yield this.vodProcessorService.processVOD(video);
            return { message: 'VOD processing started', videoId };
        });
    }
};
exports.VideoController = VideoController;
__decorate([
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    (0, common_1.Get)('/me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VideoController.prototype, "getMyVideos", null);
__decorate([
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    (0, common_1.Patch)(':id/publish'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VideoController.prototype, "publishVideo", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VideoController.prototype, "getVideoById", null);
__decorate([
    (0, common_1.Get)('stream/:streamKey'),
    __param(0, (0, common_1.Param)('streamKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VideoController.prototype, "getVideosByStreamKey", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VideoController.prototype, "getAllPublicVideos", null);
__decorate([
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    (0, common_1.Post)(':id/process'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VideoController.prototype, "processVideo", null);
exports.VideoController = VideoController = __decorate([
    (0, common_1.Controller)('videos'),
    __metadata("design:paramtypes", [video_service_1.VideoService,
        vod_processor_service_1.VodProcessorService])
], VideoController);
//# sourceMappingURL=video.controller.js.map