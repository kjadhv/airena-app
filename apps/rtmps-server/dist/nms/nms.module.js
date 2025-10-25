"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NmsModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const nms_service_1 = require("./nms.service");
const stream_module_1 = require("../stream/stream.module");
const axios_1 = require("@nestjs/axios");
let NmsModule = class NmsModule {
};
exports.NmsModule = NmsModule;
exports.NmsModule = NmsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule.register({
                timeout: 5000,
                maxRedirects: 5,
            }),
            bullmq_1.BullModule.registerQueue({
                name: 'video-processing',
            }),
            stream_module_1.StreamModule,
        ],
        providers: [nms_service_1.NmsService],
        exports: [nms_service_1.NmsService],
    })
], NmsModule);
//# sourceMappingURL=nms.module.js.map