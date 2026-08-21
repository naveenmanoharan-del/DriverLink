import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('v1/clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('client')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.clients.findByUserId(user.userId);
  }

  @Put('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateClientProfileDto) {
    return this.clients.updateByUserId(user.userId, dto);
  }
}
