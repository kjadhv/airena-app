import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Use environment variable for CORS origin
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  // The NmsService will now start automatically via onModuleInit.

  await app.listen('0.0.0.0'); // NestJS API server port
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log('Node Media Server is running on RTMP port 1935 and HTTP port 8000');
}
bootstrap();