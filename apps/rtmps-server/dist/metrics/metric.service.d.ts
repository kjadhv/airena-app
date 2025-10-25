import { MetricGateway } from './metrics.gateway';
export interface MetricState {
    bitrate: number;
    bandwidth: number;
    latency: number;
    lastUpdated: number;
}
export declare class MetricService {
    private readonly gateway;
    private metrics;
    constructor(gateway: MetricGateway);
    updateMetrics(streamKey: string, updates: Partial<MetricState>): void;
    getMetrics(streamKey: string): MetricState | null;
    getAllMetrics(): Record<string, MetricState>;
    resetMetrics(streamKey: string): void;
}
