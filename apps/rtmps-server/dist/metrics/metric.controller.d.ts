import { MetricService } from './metric.service';
export declare class MetricController {
    private readonly metricService;
    constructor(metricService: MetricService);
    getStreamMetrics(streamKey: string): import("./metric.service").MetricState | null;
    getAllStreamMetrics(): Record<string, import("./metric.service").MetricState>;
}
