import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  // Validate required environment variables
  const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    Logger.error(`Missing required environment variables: ${missingVars.join(', ')}`, 'Bootstrap');
    Logger.error('Please check your .env.local file', 'Bootstrap');
    process.exit(1);
  }

  const port = 8000;
  const app = await NestFactory.create(AppModule);

  // Enable CORS to allow your frontend to communicate with this backend
  app.enableCors({
    origin: '*', // Configure appropriately for production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(port);
  
  Logger.log(`🚀 Backend is running on: http://localhost:${port}`, 'Bootstrap');
  Logger.log(`📡 RTMP Server should be on: rtmp://localhost:1935`, 'Bootstrap');
  Logger.log(`📺 HLS Playback via: http://localhost:${port}/live/[streamKey]/index.m3u8`, 'Bootstrap');
  Logger.log(`🔧 Debug streams: http://localhost:${port}/debug/streams`, 'Bootstrap');
}

bootstrap().catch((error) => {
  Logger.error('Failed to start application', 'Bootstrap');
  Logger.error(error, 'Bootstrap');
  process.exit(1);
});