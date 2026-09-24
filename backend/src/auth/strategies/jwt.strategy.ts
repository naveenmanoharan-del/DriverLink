import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { eq } from 'drizzle-orm';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { DATABASE } from '../../database/database.module';
import type { Database } from '../../database/database.module';
import { users } from '../../database/schema';

interface JwtPayload {
  sub: string;
  role: 'worker' | 'client' | 'admin';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(DATABASE) private readonly db: Database,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Checks the account on every request rather than trusting the token alone,
   * so an admin deactivating or deleting someone takes effect at once instead
   * of when their access token expires. The role also comes from the database,
   * so a stale token can't keep a role that was changed.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const [user] = await this.db
      .select({ role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, payload.sub));
    if (!user || !user.isActive)
      throw new UnauthorizedException(
        'Account is inactive or no longer exists',
      );
    return { userId: payload.sub, role: user.role };
  }
}
