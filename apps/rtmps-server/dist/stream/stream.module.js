"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const stream_controller_1 = require("./stream.controller");
const stream_service_1 = require("./stream.service");
const stream_entity_1 = require("./stream.entity");
const user_entity_1 = require("./user.entity");
const video_module_1 = require("../video/video.module");
const vod_processor_module_1 = require("../vod-processor/vod-processor.module");
let StreamModule = class StreamModule {
};
exports.StreamModule = StreamModule;
exports.StreamModule = StreamModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([stream_entity_1.Stream, user_entity_1.User]),
            video_module_1.VideoModule,
            vod_processor_module_1.VodProcessorModule,
        ],
        controllers: [stream_controller_1.StreamController],
        providers: [stream_service_1.StreamService],
        exports: [stream_service_1.StreamService]
    })
], StreamModule);
//# sourceMappingURL=stream.module.js.map