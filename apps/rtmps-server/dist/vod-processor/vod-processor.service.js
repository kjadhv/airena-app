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
var VodProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VodProcessorService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const storage_1 = require("firebase-admin/storage");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const video_service_1 = require("../video/video.service");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
let VodProcessorService = VodProcessorService_1 = class VodProcessorService {
    constructor(videoService, configService) {
        this.videoService = videoService;
        this.configService = configService;
        this.logger = new common_1.Logger(VodProcessorService_1.name);
        this.HLS_DIRECTORY = this.configService.get('HLS_DIRECTORY', './media/live');
        this.VOD_OUTPUT_DIRECTORY = this.configService.get('VOD_OUTPUT_DIRECTORY', './media/vods');
        const bucketName = this.configService.get('FIREBASE_STORAGE_BUCKET');
        if (!bucketName) {
            throw new Error('FIREBASE_STORAGE_BUCKET environment variable not set.');
        }
        this.storageBucketName = bucketName;
    }
    processVOD(video) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.log(`Starting VOD processing for video ${video.id} (stream key: ${video.streamKey})`);
            try {
                const localHlsPath = path.join(this.HLS_DIRECTORY, video.streamKey);
                try {
                    yield fs.access(localHlsPath);
                }
                catch (error) {
                    throw new Error(`HLS directory not found at ${localHlsPath}`);
                }
                yield fs.mkdir(this.VOD_OUTPUT_DIRECTORY, { recursive: true });
                const mp4Path = yield this.convertHLSToMP4(video.streamKey, localHlsPath);
                const thumbnailPath = yield this.generateThumbnail(mp4Path, video.streamKey);
                const { videoUrl, thumbnailUrl } = yield this.uploadToStorage(video.streamKey, mp4Path, thumbnailPath);
                yield this.videoService.update(video.id, {
                    hlsUrl: videoUrl,
                    thumbnailUrl: thumbnailUrl,
                });
                this.logger.log(`VOD processing completed for video ${video.id}. Video URL: ${videoUrl}`);
                yield this.cleanupTempFiles(mp4Path, thumbnailPath);
            }
            catch (error) {
                this.logger.error(`Failed to process VOD for video ${video.id}`, error.message);
                throw error;
            }
        });
    }
    convertHLSToMP4(streamKey, localHlsPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const m3u8Path = path.join(localHlsPath, 'index.m3u8');
            const outputPath = path.join(this.VOD_OUTPUT_DIRECTORY, `${streamKey}.mp4`);
            this.logger.log(`Converting HLS to MP4: ${m3u8Path} -> ${outputPath}`);
            try {
                yield execAsync('ffmpeg -version');
            }
            catch (error) {
                throw new Error('FFmpeg is not installed or not available in PATH');
            }
            try {
                const command = `ffmpeg -i "${m3u8Path}" -c copy -bsf:a aac_adtstoasc "${outputPath}" -y`;
                this.logger.log(`Executing: ${command}`);
                const { stdout, stderr } = yield execAsync(command);
                if (stderr) {
                    this.logger.debug(`FFmpeg stderr: ${stderr}`);
                }
                yield fs.access(outputPath);
                const stats = yield fs.stat(outputPath);
                this.logger.log(`MP4 created successfully: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                return outputPath;
            }
            catch (error) {
                this.logger.error(`Failed to convert HLS to MP4`, error.message);
                throw error;
            }
        });
    }
    generateThumbnail(videoPath, streamKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const thumbnailPath = path.join(this.VOD_OUTPUT_DIRECTORY, `${streamKey}_thumb.jpg`);
            this.logger.log(`Generating thumbnail: ${thumbnailPath}`);
            try {
                const command = `ffmpeg -ss 2 -i "${videoPath}" -vframes 1 -vf "scale=1280:-1" "${thumbnailPath}" -y`;
                this.logger.log(`Executing: ${command}`);
                yield execAsync(command);
                yield fs.access(thumbnailPath);
                this.logger.log(`Thumbnail created successfully: ${thumbnailPath}`);
                return thumbnailPath;
            }
            catch (error) {
                this.logger.error(`Failed to generate thumbnail`, error.message);
                throw error;
            }
        });
    }
    uploadToStorage(streamKey, mp4Path, thumbnailPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const bucket = (0, storage_1.getStorage)().bucket();
            const destinationFolder = `vods/${streamKey}`;
            this.logger.log(`Uploading MP4 and thumbnail to ${destinationFolder}`);
            try {
                const videoFileName = `${streamKey}.mp4`;
                const videoDestination = `${destinationFolder}/${videoFileName}`;
                const videoBuffer = yield fs.readFile(mp4Path);
                this.logger.log(`Uploading video: ${videoFileName}`);
                const videoFile = bucket.file(videoDestination);
                yield videoFile.save(videoBuffer, {
                    metadata: {
                        contentType: 'video/mp4',
                        cacheControl: 'public, max-age=31536000',
                    },
                    public: true,
                });
                yield videoFile.makePublic();
                const videoUrl = `https://storage.googleapis.com/${bucket.name}/${videoDestination}`;
                this.logger.log(`Video uploaded: ${videoUrl}`);
                const thumbnailFileName = `${streamKey}_thumb.jpg`;
                const thumbnailDestination = `${destinationFolder}/${thumbnailFileName}`;
                const thumbnailBuffer = yield fs.readFile(thumbnailPath);
                this.logger.log(`Uploading thumbnail: ${thumbnailFileName}`);
                const thumbnailFile = bucket.file(thumbnailDestination);
                yield thumbnailFile.save(thumbnailBuffer, {
                    metadata: {
                        contentType: 'image/jpeg',
                        cacheControl: 'public, max-age=31536000',
                    },
                    public: true,
                });
                yield thumbnailFile.makePublic();
                const thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${thumbnailDestination}`;
                this.logger.log(`Thumbnail uploaded: ${thumbnailUrl}`);
                return { videoUrl, thumbnailUrl };
            }
            catch (error) {
                this.logger.error(`Failed to upload to storage`, error.message);
                throw error;
            }
        });
    }
    cleanupTempFiles(mp4Path, thumbnailPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.logger.log(`Cleaning up temporary files`);
                yield fs.unlink(mp4Path);
                yield fs.unlink(thumbnailPath);
                this.logger.log(`Temporary files cleaned up successfully`);
            }
            catch (error) {
                this.logger.error(`Failed to clean up temporary files`, error.message);
            }
        });
    }
    cleanupLocalFiles(localHlsPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.logger.log(`Cleaning up local HLS files at ${localHlsPath}`);
                const files = yield fs.readdir(localHlsPath);
                yield Promise.all(files.map(file => fs.unlink(path.join(localHlsPath, file))));
                yield fs.rmdir(localHlsPath);
                this.logger.log(`Local HLS files cleaned up successfully`);
            }
            catch (error) {
                this.logger.error(`Failed to clean up local HLS files`, error.message);
            }
        });
    }
};
exports.VodProcessorService = VodProcessorService;
exports.VodProcessorService = VodProcessorService = VodProcessorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [video_service_1.VideoService,
        config_1.ConfigService])
], VodProcessorService);
//# sourceMappingURL=vod-processor.service.js.map