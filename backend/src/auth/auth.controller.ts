import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RESUME_UPLOAD_OPTIONS } from '../resumes/resumes.service';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Tighter than the global default: registration is cheap to spam and creates real DB rows.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register/worker')
  // Optional `resume` file: the website sends multipart form data with one
  // attached, while the app's JSON body passes through untouched.
  @UseInterceptors(FileInterceptor('resume', RESUME_UPLOAD_OPTIONS))
  registerWorker(
    @Body() dto: RegisterWorkerDto,
    @UploadedFile() resume?: Express.Multer.File,
  ) {
    return this.auth.registerWorker(dto, resume);
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

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('change-password')
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId, user.role);
  }
}
