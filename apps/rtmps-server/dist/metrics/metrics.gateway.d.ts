import { OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
export declare class MetricGateway implements OnGatewayInit {
    server: Server;
    afterInit(): void;
    broadcastMetrics(streamKey: string, data: any): void;
}
