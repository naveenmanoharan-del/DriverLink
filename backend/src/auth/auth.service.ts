import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import {
  clientProfiles,
  refreshTokens,
  users,
  workerProfiles,
} from '../database/schema';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

type Role = 'worker' | 'client' | 'admin';

/**
 * Refresh tokens are stored only as a hash, so a database leak can't be
 * replayed against the API. A plain SHA-256 is right here (unlike for
 * passwords): the token is already long, random and high-entropy, so there is
 * nothing to brute-force and no need for a slow KDF.
 */
function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Either the pool or an open transaction.
 *
 * Registration issues its session inside the transaction that creates the user,
 * so the refresh-token row must be written on that same connection — writing it
 * via the pool would hit a foreign key against a user that hasn't committed yet.
 */
type Executor =
  | Database
  | Parameters<Parameters<Database['transaction']>[0]>[0];

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async registerWorker(dto: RegisterWorkerDto) {
    const existing = await this.db.query.users.findFirst({
      where: eq(users.phone, dto.phone),
    });
    if (existing)
      throw new ConflictException(
        'An account with this phone number already exists',
      );

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ phone: dto.phone, passwordHash, role: 'worker' })
        .returning();
      const [profile] = await tx
        .insert(workerProfiles)
        .values({
          userId: user.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          categoryId: dto.categoryId,
          yearsExperience: dto.yearsExperience ?? 0,
          minRate: dto.minRate,
          rateUnit: dto.rateUnit ?? 'day',
          city: dto.city,
        })
        .returning();
      return this.issueSession(user.id, 'worker', { user, profile }, tx);
    });
  }

  async registerClient(dto: RegisterClientDto) {
    const existing = await this.db.query.users.findFirst({
      where: eq(users.phone, dto.phone),
    });
    if (existing)
      throw new ConflictException(
        'An account with this phone number already exists',
      );

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ phone: dto.phone, passwordHash, role: 'client' })
        .returning();
      const [profile] = await tx
        .insert(clientProfiles)
        .values({
          userId: user.id,
          name: dto.name,
          companyName: dto.companyName,
          clientType: dto.clientType ?? 'individual',
          city: dto.city,
        })
        .returning();
      return this.issueSession(user.id, 'client', { user, profile }, tx);
    });
  }

  async login(dto: LoginDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.phone, dto.phone),
    });
    if (!user)
      throw new UnauthorizedException('Invalid phone number or password');
    if (!user.isActive) throw new UnauthorizedException('Account is inactive');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid)
      throw new UnauthorizedException('Invalid phone number or password');

    const profile = await this.loadProfile(user.id, user.role);
    return this.issueSession(user.id, user.role, { user, profile });
  }

  async refresh(dto: RefreshDto) {
    let payload: { sub: string; role: Role };
    try {
      payload = await this.jwt.verifyAsync(dto.refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // A signature alone isn't enough: the token must still be a live, unrevoked
    // session. This is what makes logout and rotation actually enforceable.
    const stored = await this.db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.tokenHash, hashToken(dto.refreshToken)),
        isNull(refreshTokens.revokedAt),
      ),
    });
    if (!stored || stored.expiresAt.getTime() < Date.now())
      throw new UnauthorizedException('Invalid or expired refresh token');

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });
    if (!user || !user.isActive)
      throw new UnauthorizedException('Account no longer active');

    // Rotate: the token just used is burned, so replaying it fails.
    await this.revokeById(stored.id);

    const profile = await this.loadProfile(user.id, user.role);
    return this.issueSession(user.id, user.role, { user, profile });
  }

  /**
   * Ends a session server-side. Idempotent, and deliberately silent about
   * whether the token was recognised — logging out should never become a way
   * to probe which tokens are valid.
   */
  async logout(refreshToken: string) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, hashToken(refreshToken)),
          isNull(refreshTokens.revokedAt),
        ),
      );
    return { success: true };
  }

  private async revokeById(id: string) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, id));
  }

  async me(userId: string, role: Role) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new UnauthorizedException();
    const profile = await this.loadProfile(userId, role);
    return { user: this.sanitizeUser(user), profile };
  }

  private async loadProfile(userId: string, role: Role) {
    if (role === 'worker')
      return this.db.query.workerProfiles.findFirst({
        where: eq(workerProfiles.userId, userId),
      });
    if (role === 'client')
      return this.db.query.clientProfiles.findFirst({
        where: eq(clientProfiles.userId, userId),
      });
    return null;
  }

  private sanitizeUser(user: typeof users.$inferSelect) {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  private async issueSession(
    userId: string,
    role: Role,
    extra: { user: typeof users.$inferSelect; profile: unknown },
    executor: Executor = this.db,
  ) {
    const payload = { sub: userId, role };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ??
        '15m') as JwtSignOptions['expiresIn'],
    });
    // `jti` gives every refresh token its own identity. Without it two tokens
    // minted for the same user in the same second are byte-identical — `iat`
    // only has one-second resolution — which collides on the token_hash unique
    // index (login straight after register, or a fast refresh, both hit this).
    const refreshToken = this.jwt.sign(
      { ...payload, jti: randomUUID() },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.config.get<string>('JWT_REFRESH_TTL') ??
          '7d') as JwtSignOptions['expiresIn'],
      },
    );

    // Record the issued refresh token so it can be revoked later. Read the
    // expiry back off the signed token rather than re-deriving it from config,
    // so the row can never disagree with the JWT itself.
    const decoded = this.jwt.decode<{ exp?: number }>(refreshToken);
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await executor.insert(refreshTokens).values({
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(extra.user),
      profile: extra.profile,
    };
  }
}
