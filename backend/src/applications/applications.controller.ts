import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { DecideApplicationDto } from './dto/decide-application.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Roles('worker')
  @Post('v1/jobs/:jobId/applications')
  apply(
    @CurrentUser() user: AuthUser,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applications.apply(user.userId, jobId, dto);
  }

  @Roles('client')
  @Get('v1/jobs/:jobId/applications')
  listForJob(@CurrentUser() user: AuthUser, @Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.applications.listForJob(user.userId, jobId);
  }

  @Roles('worker')
  @Get('v1/applications/mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.applications.mine(user.userId);
  }

  @Roles('client')
  @Patch('v1/applications/:id')
  decide(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideApplicationDto,
  ) {
    return this.applications.decide(user.userId, id, dto);
  }

  @Roles('worker')
  @Patch('v1/applications/:id/withdraw')
  withdraw(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.applications.withdraw(user.userId, id);
  }
}
