import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { INestApplication, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app: INestApplication = await NestFactory.create(AppModule);

  // 1. GLOBAL MIDDLEWARE & PIPES (Must come BEFORE listen)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

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

  await app.listen(port);

  // Use a simple log since getUrl() can sometimes be finicky in certain cloud environments
  console.log(`🚀 ERP API is live on port ${port}`);
  console.log(`📖 Swagger docs available at /api`);
}
bootstrap();
