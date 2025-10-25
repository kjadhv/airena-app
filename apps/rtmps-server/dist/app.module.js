"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const nms_module_1 = require("./nms/nms.module");
const stream_module_1 = require("./stream/stream.module");
const metric_module_1 = require("./metrics/metric.module");
const queue_module_1 = require("./queue/queue.module");
const video_module_1 = require("./video/video.module");
const firebase_module_1 = require("./firebase/firebase.module");
const moderation_module_1 = require("./moderation/moderation.module");
const chat_module_1 = require("./chat/chat.module");
const reports_module_1 = require("./reports/reports.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'postgres',
                    url: configService.get('DATABASE_URL'),
                    autoLoadEntities: true,
                    synchronize: true,
                }),
            }),
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    connection: {
                        host: configService.get('REDIS_HOST', 'localhost'),
                        port: parseInt(configService.get('REDIS_PORT', '6379')),
                    },
                }),
            }),
            stream_module_1.StreamModule,
            metric_module_1.MetricsModule,
            nms_module_1.NmsModule,
            queue_module_1.QueueModule,
            video_module_1.VideoModule,
            firebase_module_1.FirebaseModule,
            moderation_module_1.ModerationModule,
            chat_module_1.ChatModule,
            reports_module_1.ReportsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map