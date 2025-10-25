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
var VideoProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const firebase_service_1 = require("../firebase/firebase.service");
const video_service_1 = require("../video/video.service");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
let VideoProcessor = VideoProcessor_1 = class VideoProcessor extends bullmq_1.WorkerHost {
    constructor(configService, firebaseService, videoService) {
        super();
        this.configService = configService;
        this.firebaseService = firebaseService;
        this.videoService = videoService;
        this.logger = new common_1.Logger(VideoProcessor_1.name);
    }
    process(job) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (job.name) {
                case 'transcode-hls':
                    return this.handleTranscodeHls(job);
                default:
                    throw new Error(`Unknown job type: ${job.name}`);
            }
        });
    }
    handleTranscodeHls(job) {
        return __awaiter(this, void 0, void 0, function* () {
            const { filePath, streamKey } = job.data;
            this.logger.log(`Starting HLS transcoding for stream key: ${streamKey}`);
            const mediaRoot = this.configService.get('MEDIA_ROOT');
            if (!mediaRoot) {
                throw new Error('MEDIA_ROOT environment variable not set!');
            }
            const outputDir = path.join(mediaRoot, 'vod', streamKey);
            const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
            const hlsPlaylistPath = path.join(outputDir, 'playlist.m3u8');
            try {
                yield fs.mkdir(outputDir, { recursive: true });
                const thumbnailCommand = `ffmpeg -i "${filePath}" -ss 00:00:01.000 -vframes 1 "${thumbnailPath}"`;
                this.logger.log(`Executing: ${thumbnailCommand}`);
                yield execPromise(thumbnailCommand);
                const hlsCommand = `ffmpeg -i "${filePath}" -vf "scale=-2:720" -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${outputDir}/segment%03d.ts" "${hlsPlaylistPath}"`;
                this.logger.log(`Executing: ${hlsCommand}`);
                yield execPromise(hlsCommand);
                this.logger.log(`HLS transcoding finished for ${streamKey}.`);
                this.logger.log('Uploading files to Firebase Storage...');
                const hlsUrl = yield this.firebaseService.uploadDirectory(outputDir, `vods/${streamKey}`);
                const thumbnailUrl = yield this.firebaseService.getFileUrl(`vods/${streamKey}/thumbnail.jpg`);
                this.logger.log(`Upload complete. HLS URL: ${hlsUrl}`);
                yield this.videoService.create({
                    title: `VOD for stream ${streamKey}`,
                    streamKey: streamKey,
                    hlsUrl: hlsUrl,
                    thumbnailUrl: thumbnailUrl,
                });
                this.logger.log('Video metadata saved to database.');
                yield fs.rm(filePath);
                yield fs.rm(outputDir, { recursive: true, force: true });
                return { status: 'complete', hlsUrl };
            }
            catch (error) {
                if (error instanceof Error) {
                    this.logger.error(`Processing failed for job ${job.id}:`, error.stack);
                }
                else {
                    this.logger.error(`Processing failed for job ${job.id} with an unknown error:`, error);
                }
                if (yield fs.stat(outputDir).catch(() => false)) {
                    yield fs.rm(outputDir, { recursive: true, force: true });
                }
                throw error;
            }
        });
    }
};
exports.VideoProcessor = VideoProcessor;
exports.VideoProcessor = VideoProcessor = VideoProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)('video-processing'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        firebase_service_1.FirebaseService,
        video_service_1.VideoService])
], VideoProcessor);
//# sourceMappingURL=video.processor.js.map