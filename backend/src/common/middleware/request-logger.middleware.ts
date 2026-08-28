import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * Logs one line per request: method, path, status and duration.
 *
 * Deliberately logs **no bodies, headers or query values** — those carry
 * passwords, phone numbers and bearer tokens, none of which belong in a log
 * file. The path alone is enough to see traffic and spot failures.
 *
 * Enabled via `REQUEST_LOGGING=true` so it can be turned off in environments
 * where an upstream proxy already produces an access log.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const startedAt = Date.now();
    const { method } = req;
    // originalUrl includes the query string; strip it so tokens or filters
    // never reach the log.
    const path = req.originalUrl.split('?')[0];

    res.on('finish', () => {
      const ms = Date.now() - startedAt;
      const line = `${method} ${path} ${res.statusCode} ${ms}ms`;
      if (res.statusCode >= 500) this.logger.error(line);
      else if (res.statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });

    next();
  }
}
