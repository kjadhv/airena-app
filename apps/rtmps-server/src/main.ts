import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS for Vercel frontend
  app.enableCors({
    origin: [
      configService.get('FRONTEND_URL') || 'https://www.airena.app',
      'https://airena.app',
      'http://localhost:3000', // for local dev
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600, // Cache preflight requests for 1 hour
  });

  const port = configService.get('PORT') || 3000;
  
  // Bind to 0.0.0.0 to accept external connections
  await app.listen(port, '0.0.0.0');
  
  console.log(`✅ Application is running on: http://0.0.0.0:${port}`);
  console.log(`🌍 Public URL: https://api.airena.app`);
  console.log(`📡 CORS enabled for: ${configService.get('FRONTEND_URL')}`);
}

bootstrap();