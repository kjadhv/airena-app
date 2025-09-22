// apps/rtmps-server/src/metrics/metric.module.ts

import { Module } from '@nestjs/common';
import { MetricService } from './metric.service';
import { MetricGateway } from './metrics.gateway';
import { MetricController } from './metric.controller';

@Module({
  providers: [MetricService, MetricGateway],
  controllers: [MetricController],
  exports: [MetricService], // You only need to export the service
})
export class MetricsModule {}