import {
  BadRequestException,
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
import { and, eq, isNull, or } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import {
  categories,
  clientProfiles,
  refreshTokens,
  users,
  workerProfiles,
} from '../database/schema';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { publicProfileOrNull } from '../workers/public-profile';
import { detailsTable, MailService } from '../mail/mail.service';
import { ResumesService } from '../resumes/resumes.service';
import type { UploadedResume } from '../resumes/resumes.service';

const BACKGROUND_LABELS: Record<string, string> = {
  retired_railway: 'Retired from Railways',
  retired_govt: 'Retired from other Govt / PSU',
  private_sector: 'Private sector',
  fresher: 'Fresher / recent graduate',
};

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
  Database | Parameters<Parameters<Database['transaction']>[0]>[0];

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly resumes: ResumesService,
  ) {}

  /** Rejects a phone number or email that already belongs to an account. */
  private async assertUnused(phone: string, email?: string) {
    const existing = await this.db.query.users.findFirst({
      where: email
        ? or(eq(users.phone, phone), eq(users.email, email))
        : eq(users.phone, phone),
    });
    if (!existing) return;
    throw new ConflictException(
      existing.phone === phone
        ? 'An account with this phone number already exists'
        : 'An account with this email already exists',
    );
  }

  /**
   * A 400 for an unknown or retired category. Without it an unknown id hits
   * the foreign key and surfaces as a 500, and a retired one (e.g. an old
   * artisan category) would still be accepted.
   */
  private async assertActiveCategory(categoryId: string) {
    const category = await this.db.query.categories.findFirst({
      where: eq(categories.id, categoryId),
    });
    if (!category?.isActive)
      throw new BadRequestException('Choose one of the listed positions');
  }

  async registerWorker(dto: RegisterWorkerDto, resume?: UploadedResume) {
    const email = dto.email?.trim().toLowerCase() || undefined;
    await this.assertUnused(dto.phone, email);
    await this.assertActiveCategory(dto.categoryId);
    // Reject a bad file before creating anything, so a failed upload doesn't
    // leave behind an account the person then can't re-register.
    if (resume) this.resumes.validate(resume);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const session = await this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ phone: dto.phone, email, passwordHash, role: 'worker' })
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
          rateUnit: dto.rateUnit ?? 'month',
          city: dto.city,
          background: dto.background,
          sectors: dto.sectors ?? [],
          qualification: dto.qualification,
          lastDesignation: dto.lastDesignation,
          lastOrganisation: dto.lastOrganisation,
          retirementYear: dto.retirementYear,
        })
        .returning();
      if (resume) await this.resumes.save(profile.id, resume, tx);
      return this.issueSession(
        user.id,
        'worker',
        { user, profile: publicProfileOrNull(profile) },
        tx,
      );
    });

    // After commit, and not awaited: the person shouldn't wait on the mail
    // provider, and a mail failure must not undo a successful registration.
    void this.notifyWorkerRegistered(dto, email, resume);
    return session;
  }

  private async notifyWorkerRegistered(
    dto: RegisterWorkerDto,
    email: string | undefined,
    resume?: UploadedResume,
  ) {
    const category = await this.db.query.categories
      .findFirst({ where: eq(categories.id, dto.categoryId) })
      .catch(() => undefined);
    const name = [dto.firstName, dto.lastName].filter(Boolean).join(' ');
    await this.mail.notifyAdmin(
      `New candidate: ${name} - ${category?.name ?? 'unknown role'}${resume ? '' : ' (no resume)'}`,
      `<p style="font-family:sans-serif">A new candidate registered on Yukti Solutions.</p>` +
        detailsTable([
          ['Name', name],
          ['Role', category?.name],
          ['Phone', dto.phone],
          ['Email', email],
          ['Background', dto.background && BACKGROUND_LABELS[dto.background]],
          ['Sectors', dto.sectors?.join(', ')],
          ['Qualification', dto.qualification],
          ['Experience', `${dto.yearsExperience ?? 0} years`],
          ['Last designation', dto.lastDesignation],
          ['Last organisation', dto.lastOrganisation],
          ['Retirement year', dto.retirementYear],
          ['City', dto.city],
          [
            'Expected remuneration',
            `INR ${dto.minRate} / ${dto.rateUnit ?? 'month'}`,
          ],
          ['Resume', resume ? 'attached' : 'not uploaded'],
        ]),
      resume ? [{ filename: resume.originalname, content: resume.buffer }] : [],
    );
  }

  async registerClient(dto: RegisterClientDto) {
    const email = dto.email?.trim().toLowerCase() || undefined;
    await this.assertUnused(dto.phone, email);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const session = await this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ phone: dto.phone, email, passwordHash, role: 'client' })
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

    void this.mail.notifyAdmin(
      `New client account: ${dto.companyName || dto.name}`,
      `<p style="font-family:sans-serif">A new client registered on Yukti Solutions.</p>` +
        detailsTable([
          ['Name', dto.name],
          ['Company', dto.companyName],
          ['Type', dto.clientType ?? 'individual'],
          ['Phone', dto.phone],
          ['Email', email],
          ['City', dto.city],
        ]),
    );
    return session;
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

    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));
    const profile = await this.loadProfile(user.id, user.role);
    return this.issueSession(user.id, user.role, { user, profile });
  }

  /** Changes the signed-in user's password and ends their other sessions. */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash)))
      throw new UnauthorizedException('Current password is incorrect');
    await this.db
      .update(users)
      .set({
        passwordHash: await bcrypt.hash(newPassword, 10),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );
    return { success: true };
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
      return publicProfileOrNull(
        await this.db.query.workerProfiles.findFirst({
          where: eq(workerProfiles.userId, userId),
        }),
      );
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
