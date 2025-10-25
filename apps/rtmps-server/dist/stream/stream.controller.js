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
var StreamController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const stream_service_1 = require("./stream.service");
let StreamController = StreamController_1 = class StreamController {
    constructor(streamService) {
        this.streamService = streamService;
        this.logger = new common_1.Logger(StreamController_1.name);
    }
    getLiveStreams() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.streamService.getActiveStreams();
        });
    }
    getExistingCredentials(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!userId)
                throw new common_1.BadRequestException("userId query parameter is required");
            const credentials = yield this.streamService.getExistingCredentials(userId);
            if (!credentials) {
                return { exists: false };
            }
            return credentials;
        });
    }
    getStreamCredentials(detailsDto, file) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!detailsDto.userId)
                throw new common_1.BadRequestException("userId is required");
            if (!file)
                throw new common_1.BadRequestException("thumbnail file is required");
            return this.streamService.getStreamCredentials(detailsDto, file);
        });
    }
    updateStreamStatusFromHook(hookDto) {
        return __awaiter(this, void 0, void 0, function* () {
            const { streamKey, isActive } = hookDto;
            if (!streamKey)
                throw new common_1.BadRequestException("streamKey is required");
            yield this.streamService.updateStreamStatus(streamKey, isActive);
        });
    }
    regenerateStreamKey(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!userId)
                throw new common_1.BadRequestException("userId is required");
            return this.streamService.regenerateStreamKey(userId);
        });
    }
    getStreamStatus(streamKey) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const stream = yield this.streamService.getStreamByKey(streamKey);
            if (!stream)
                throw new common_1.NotFoundException(`Stream with key ${streamKey} not found`);
            return {
                isActive: stream.isActive,
                title: stream.title,
                authorName: (_a = stream.user) === null || _a === void 0 ? void 0 : _a.displayName,
            };
        });
    }
};
exports.StreamController = StreamController;
__decorate([
    (0, common_1.Get)("live"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StreamController.prototype, "getLiveStreams", null);
__decorate([
    (0, common_1.Get)("credentials"),
    __param(0, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StreamController.prototype, "getExistingCredentials", null);
__decorate([
    (0, common_1.Post)("credentials"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('thumbnail')),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StreamController.prototype, "getStreamCredentials", null);
__decorate([
    (0, common_1.Post)("hooks/status"),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StreamController.prototype, "updateStreamStatusFromHook", null);
__decorate([
    (0, common_1.Post)("regenerate-key"),
    __param(0, (0, common_1.Body)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StreamController.prototype, "regenerateStreamKey", null);
__decorate([
    (0, common_1.Get)("status/:streamKey"),
    __param(0, (0, common_1.Param)("streamKey")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StreamController.prototype, "getStreamStatus", null);
exports.StreamController = StreamController = StreamController_1 = __decorate([
    (0, common_1.Controller)("stream"),
    __metadata("design:paramtypes", [stream_service_1.StreamService])
], StreamController);
//# sourceMappingURL=stream.controller.js.map