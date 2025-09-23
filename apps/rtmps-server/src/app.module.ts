import { HlsController } from './hls/hls.controller';
// REMOVED: forwardRef as it's no longer needed here
import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StreamController } from './stream/stream.controller';
import { FirebaseAuthMiddleware } from './firebase-auth.middleware';
import { MetricsModule } from './metrics/metric.module';
import { StreamModule } from './stream/stream.module';
// REMOVED: NmsService is no longer provided here

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env.local',
    }),
    // FIX: Just import StreamModule directly now.
    StreamModule,
    MetricsModule,
  ],
  controllers: [HlsController],
  // FIX: NmsService has been moved to StreamModule.
  providers: [],
  exports: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(FirebaseAuthMiddleware)
      .exclude(
        { path: 'stream/status/:streamKey', method: RequestMethod.GET },
        { path: 'stream/start/:streamKey', method: RequestMethod.POST },
        { path: 'stream/stop/:streamKey', method: RequestMethod.POST },
      )
      .forRoutes(StreamController);
  }
}