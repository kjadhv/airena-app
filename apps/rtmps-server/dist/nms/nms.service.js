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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var NmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NmsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const node_media_server_1 = __importDefault(require("node-media-server"));
const stream_service_1 = require("../stream/stream.service");
const rxjs_1 = require("rxjs");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let NmsService = NmsService_1 = class NmsService {
    constructor(videoQueue, configService, streamService, httpService) {
        this.videoQueue = videoQueue;
        this.configService = configService;
        this.streamService = streamService;
        this.httpService = httpService;
        this.logger = new common_1.Logger(NmsService_1.name);
        const apiUrl = this.configService.get('API_URL');
        if (!apiUrl) {
            throw new Error('FATAL: API_URL environment variable is not set for the NMS service.');
        }
        this.API_HOOK_URL = `${apiUrl}/stream/hooks/status`;
        this.MEDIA_ROOT = this.configService.get('MEDIA_ROOT', path.join(__dirname, '..', '..', 'media'));
    }
    onModuleInit() {
        const ffmpegPath = this.configService.get('FFMPEG_PATH');
        if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
            this.logger.error(`❌ FFmpeg binary not found at path: ${ffmpegPath}`);
            process.exit(1);
        }
        if (!fs.existsSync(this.MEDIA_ROOT)) {
            fs.mkdirSync(this.MEDIA_ROOT, { recursive: true });
        }
        const config = {
            rtmp: { port: 1935, chunk_size: 60000, gop_cache: true, ping: 30, ping_timeout: 60 },
            http: { port: 8000, mediaroot: this.MEDIA_ROOT, allow_origin: '*' },
            trans: {
                ffmpeg: ffmpegPath,
                tasks: [{ app: 'live', hls: true, hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]', hlsKeep: true }]
            },
        };
        this.nms = new node_media_server_1.default(config);
        this.setupStreamEvents();
        this.nms.run();
        this.logger.log('✅ NMS Service Initialized');
        this.logger.log(`🎬 FFmpeg Path: ${ffmpegPath}`);
        this.logger.log(`📡 Notifying Main API at: ${this.API_HOOK_URL}`);
    }
    notifyApiOfStreamStatus(streamKey, isActive) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const status = isActive ? 'LIVE' : 'OFFLINE';
            this.logger.log(`[HOOK] Notifying API that stream '${streamKey}' is now ${status}.`);
            try {
                const payload = { streamKey, isActive };
                yield (0, rxjs_1.firstValueFrom)(this.httpService.post(this.API_HOOK_URL, payload));
                this.logger.log(`[HOOK] Successfully notified API for stream '${streamKey}'.`);
            }
            catch (error) {
                let errorMessage = 'Unknown error';
                if (typeof error === 'object' && error !== null) {
                    errorMessage =
                        ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) ||
                            error.message ||
                            errorMessage;
                }
                this.logger.error(`[HOOK] Failed to notify API for stream '${streamKey}'. Error: ${errorMessage}`);
            }
        });
    }
    setupStreamEvents() {
        this.nms.on('prePublish', (id, StreamPath, args) => __awaiter(this, void 0, void 0, function* () {
            const streamKey = StreamPath.split('/').pop();
            this.logger.log(`[AUTH] Attempting to publish stream with key: ${streamKey}`);
            if (!streamKey) {
                const session = this.nms.getSession(id);
                this.logger.warn('[AUTH] REJECTED: Stream path is invalid.');
                return session.reject();
            }
            const stream = yield this.streamService.getStreamByKey(streamKey);
            if (!stream) {
                const session = this.nms.getSession(id);
                this.logger.warn(`[AUTH] REJECTED: Stream key '${streamKey}' not found.`);
                return session.reject();
            }
            this.logger.log(`[AUTH] ACCEPTED: Stream key '${streamKey}' is valid.`);
            this.notifyApiOfStreamStatus(streamKey, true);
        }));
        this.nms.on('donePublish', (id, StreamPath, args) => __awaiter(this, void 0, void 0, function* () {
            const streamKey = StreamPath.split('/').pop();
            this.logger.log(`[NMS] Stream ended: ${streamKey}`);
            if (streamKey) {
                this.notifyApiOfStreamStatus(streamKey, false);
                this.queueTranscodingJob(streamKey);
            }
        }));
    }
    queueTranscodingJob(streamKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawFilePath = path.join(this.MEDIA_ROOT, 'live', `${streamKey}.flv`);
            if (!fs.existsSync(rawFilePath)) {
                this.logger.error(`[QUEUE] Cannot queue job. Source file not found: ${rawFilePath}`);
                return;
            }
            try {
                yield this.videoQueue.add('transcode-hls', { filePath: rawFilePath, streamKey });
                this.logger.log(`[QUEUE] Successfully added transcoding job for '${streamKey}'.`);
            }
            catch (error) {
                const errorMsg = (error instanceof Error) ? error.message : String(error);
                this.logger.error(`[QUEUE] Failed to add transcoding job for '${streamKey}'. Error: ${errorMsg}`);
            }
        });
    }
};
exports.NmsService = NmsService;
exports.NmsService = NmsService = NmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('video-processing')),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        config_1.ConfigService,
        stream_service_1.StreamService,
        axios_1.HttpService])
], NmsService);
//# sourceMappingURL=nms.service.js.map