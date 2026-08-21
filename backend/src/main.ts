import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Deployments (e.g. AWS Lightsail behind Nginx/a load balancer) terminate TLS in front of
  // this process, so the real client IP arrives via X-Forwarded-For. Without this, rate
  // limiting below would key off the proxy's IP instead of each client's, throttling everyone
  // as a single caller. `1` trusts exactly one hop (the immediate proxy) — safe for a single
  // reverse proxy in front of the app; do not use `true` (trusts the whole chain).
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? true,
    credentials: true,
  });
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Manpower API listening on http://localhost:${port}/api`);
}
void bootstrap();
