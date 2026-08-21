import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('v1/jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateJobDto) {
    return this.jobs.create(user.userId, dto);
  }

  @Get()
  search(@Query() query: SearchJobsDto) {
    return this.jobs.search(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.jobs.findMine(user.userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.jobs.updateStatus(user.userId, id, dto);
  }
}
