import {
  Module,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { WorkersModule } from './workers/workers.module';
import { ClientsModule } from './clients/clients.module';
import { JobsModule } from './jobs/jobs.module';
import { MailModule } from './mail/mail.module';
import { ResumesModule } from './resumes/resumes.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('RATE_LIMIT_TTL_MS') ?? 60_000,
            limit: config.get<number>('RATE_LIMIT_LIMIT') ?? 60,
          },
        ],
      }),
    }),
    DatabaseModule,
    MailModule,
    ResumesModule,
    AuthModule,
    CategoriesModule,
    WorkersModule,
    ClientsModule,
    JobsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Off by default: behind a proxy the access log usually lives there, and
    // an extra line per request is noise. Set REQUEST_LOGGING=true to enable.
    if (process.env.REQUEST_LOGGING === 'true') {
      consumer.apply(RequestLoggerMiddleware).forRoutes('*');
    }
  }
}
