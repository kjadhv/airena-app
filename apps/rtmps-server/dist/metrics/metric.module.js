"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsModule = void 0;
const common_1 = require("@nestjs/common");
const metric_service_1 = require("./metric.service");
const metrics_gateway_1 = require("./metrics.gateway");
const metric_controller_1 = require("./metric.controller");
let MetricsModule = class MetricsModule {
};
exports.MetricsModule = MetricsModule;
exports.MetricsModule = MetricsModule = __decorate([
    (0, common_1.Module)({
        providers: [metric_service_1.MetricService, metrics_gateway_1.MetricGateway],
        controllers: [metric_controller_1.MetricController],
        exports: [metric_service_1.MetricService, metrics_gateway_1.MetricGateway],
    })
], MetricsModule);
//# sourceMappingURL=metric.module.js.map