import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkersService } from './workers.service';
import { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto';
import { SearchWorkersDto } from './dto/search-workers.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('v1/workers')
export class WorkersController {
  constructor(private readonly workers: WorkersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('worker')
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.workers.findByUserId(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('worker')
  @Put('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateWorkerProfileDto) {
    return this.workers.updateByUserId(user.userId, dto);
  }

  @Get()
  search(@Query() query: SearchWorkersDto) {
    return this.workers.search(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workers.findOne(id);
  }
}
