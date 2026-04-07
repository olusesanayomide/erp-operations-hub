import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/$/, '');
}

function getAllowedOrigins() {
  const configuredOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(normalizeOrigin).filter(Boolean)
    : [];

  const defaultOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  return new Set([...defaultOrigins, ...configuredOrigins]);
}

async function bootstrap() {
  const app: INestApplication = await NestFactory.create(AppModule);
  const allowedOrigins = getAllowedOrigins();
  const allowNgrokOrigins = process.env.CORS_ALLOW_NGROK !== 'false';

  // 1. GLOBAL MIDDLEWARE & PIPES (Must come BEFORE listen)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);
      const isNgrokOrigin =
        allowNgrokOrigins &&
        /^https:\/\/[a-z0-9-]+\.(ngrok-free\.app|ngrok-free\.dev|ngrok\.io)$/i.test(
          normalizedOrigin,
        );

      if (allowedOrigins.has(normalizedOrigin) || isNgrokOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: true,
  });

  // 2. SWAGGER CONFIGURATION
  const config = new DocumentBuilder()
    .setTitle('MANIFEST ERP API')
    .setDescription('The core engine for Inventory, Orders, and Procurement.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api', app, document);

  // 3. START THE SERVER
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);

  console.log(`ERP API is live on ${host}:${port}`);
  console.log('Swagger docs available at /api');
}

bootstrap();
