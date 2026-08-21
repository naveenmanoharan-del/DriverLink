import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Tighter than the global default: registration is cheap to spam and creates real DB rows.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register/worker')
  registerWorker(@Body() dto: RegisterWorkerDto) {
    return this.auth.registerWorker(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register/client')
  registerClient(@Body() dto: RegisterClientDto) {
    return this.auth.registerClient(dto);
  }

  // Slightly looser than registration to tolerate a few mistyped-password retries,
  // but still far below the global default to blunt credential-stuffing/brute force.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  /**
   * Revokes the supplied refresh token. Not guarded by JwtAuthGuard on purpose:
   * the access token has usually already expired by the time someone logs out,
   * and the refresh token itself is the credential being surrendered.
   */
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId, user.role);
  }
}
