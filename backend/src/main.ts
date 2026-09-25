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
  // CORS_ORIGIN is documented as a comma-separated list, so split it rather
  // than handing the raw string to cors() — "a.com,b.com" is not a valid origin
  // and would silently reject both. Unset means reflect any origin, which is
  // fine locally but should be pinned to the real web origin in production.
  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  app.enableCors({
    origin:
      !corsOrigin || corsOrigin === '*'
        ? true
        : corsOrigin.split(',').map((o) => o.trim()).filter(Boolean),
    credentials: true,
  });
  const port = process.env.PORT ?? 3000;
  // HOST=127.0.0.1 behind a local reverse proxy (see deploy/lightsail); unset listens everywhere.
  const host = process.env.HOST?.trim();
  if (host) await app.listen(port, host);
  else await app.listen(port);
  console.log(`Manpower API listening on http://localhost:${port}/api`);
}
void bootstrap();
