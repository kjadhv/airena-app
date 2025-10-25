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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Video = exports.VideoStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../stream/user.entity");
var VideoStatus;
(function (VideoStatus) {
    VideoStatus["PRIVATE"] = "private";
    VideoStatus["PUBLIC"] = "public";
})(VideoStatus || (exports.VideoStatus = VideoStatus = {}));
let Video = class Video {
};
exports.Video = Video;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Video.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Video.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Video.prototype, "streamKey", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Video.prototype, "hlsUrl", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Video.prototype, "thumbnailUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: VideoStatus,
        default: VideoStatus.PRIVATE,
    }),
    __metadata("design:type", String)
], Video.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'uploader_id', nullable: true }),
    __metadata("design:type", String)
], Video.prototype, "uploaderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'uploader_id' }),
    __metadata("design:type", user_entity_1.User)
], Video.prototype, "uploader", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Video.prototype, "createdAt", void 0);
exports.Video = Video = __decorate([
    (0, typeorm_1.Entity)('videos')
], Video);
//# sourceMappingURL=video.entity.js.map