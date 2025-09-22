import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const port = 8000; // The designated port for your backend
  const app = await NestFactory.create(AppModule);

  // Enable CORS to allow your frontend to communicate with this backend
  app.enableCors();

  await app.listen(port);
  Logger.log(`🚀 Backend is running on: http://localhost:${port}`, 'Bootstrap');
}
bootstrap();