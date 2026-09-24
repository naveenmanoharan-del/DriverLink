import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import {
  AuditQueryDto,
  CandidateQueryDto,
  ClientQueryDto,
  CreateAdminDto,
  CreatePlacementDto,
  PlacementQueryDto,
  SetActiveDto,
  StatsQueryDto,
  UpdateCandidateDto,
  UpdatePlacementDto,
} from './dto/admin.dto';
import { toCsv } from './csv';
import { indiaDate } from '../common/india-date';

const BACKGROUND_LABELS: Record<string, string> = {
  retired_railway: 'Retired railway',
  retired_govt: 'Retired govt/PSU',
  private_sector: 'Private sector',
};

@Controller('v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
// The panel fires several requests per screen; the global 60/min is sized for
// anonymous traffic, not for someone working through a list all day.
@Throttle({ default: { limit: 300, ttl: 60_000 } })
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  private actor(user: AuthUser) {
    return { userId: user.userId };
  }

  @Get('stats')
  stats(@Query() q: StatsQueryDto) {
    return this.admin.stats(q.days);
  }

  @Get('candidates')
  candidates(@Query() q: CandidateQueryDto) {
    return this.admin.listCandidates(q);
  }

  @Get('candidates/export')
  async exportCandidates(@Query() q: CandidateQueryDto, @Res() res: Response) {
    const rows = await this.admin.exportCandidates(q);
    const csv = toCsv(
      [
        'Name',
        'Phone',
        'Email',
        'Position',
        'Department',
        'Background',
        'Sectors',
        'Qualification',
        'Experience (yrs)',
        'Last designation',
        'Last organisation',
        'Retirement year',
        'City',
        'Expected (INR)',
        'Per',
        'Pipeline',
        'Verification',
        'Resume',
        'Account active',
        'Registered',
        'Notes',
      ],
      rows.map((r) => [
        r.name,
        r.phone,
        r.email,
        r.category,
        r.group,
        r.background ? BACKGROUND_LABELS[r.background] : '',
        r.sectors.join(', '),
        r.qualification,
        r.yearsExperience,
        r.lastDesignation,
        r.lastOrganisation,
        r.retirementYear,
        r.city,
        r.minRate,
        r.rateUnit,
        r.pipelineStatus,
        r.verificationStatus,
        r.hasResume ? 'yes' : 'no',
        r.isActive ? 'yes' : 'no',
        indiaDate(r.createdAt),
        r.adminNotes,
      ]),
    );
    const stamp = indiaDate(new Date());
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="candidates-${stamp}.csv"`,
    });
    res.send(csv);
  }

  @Get('candidates/:id')
  candidate(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getCandidate(id);
  }

  @Patch('candidates/:id')
  updateCandidate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.admin.updateCandidate(id, dto, this.actor(user));
  }

  /** ?inline=true shows the file in the browser (PDF preview). */
  @Get('candidates/:id/resume')
  async resume(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('inline') inline: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.admin.candidateResume(id);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `${inline === 'true' ? 'inline' : 'attachment'}; filename="${encodeURIComponent(file.fileName)}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    res.send(file.data);
  }

  @Get('clients')
  clients(@Query() q: ClientQueryDto) {
    return this.admin.listClients(q);
  }

  @Get('clients/:id')
  client(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getClient(id);
  }

  @Patch('users/:userId/active')
  setActive(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SetActiveDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.admin.setActive(userId, dto.isActive, this.actor(user));
  }

  @Delete('users/:userId')
  deleteUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.admin.deleteUser(userId, this.actor(user));
  }

  @Get('placements')
  placements(@Query() q: PlacementQueryDto) {
    return this.admin.listPlacements(q);
  }

  @Post('placements')
  createPlacement(
    @Body() dto: CreatePlacementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.admin.createPlacement(dto, this.actor(user));
  }

  @Patch('placements/:id')
  updatePlacement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlacementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.admin.updatePlacement(id, dto, this.actor(user));
  }

  @Delete('placements/:id')
  deletePlacement(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.admin.deletePlacement(id, this.actor(user));
  }

  @Get('companies')
  companies() {
    return this.admin.companies();
  }

  @Get('admins')
  admins() {
    return this.admin.listAdmins();
  }

  @Post('admins')
  createAdmin(@Body() dto: CreateAdminDto, @CurrentUser() user: AuthUser) {
    return this.admin.createAdmin(dto, this.actor(user));
  }

  @Get('audit')
  audit(@Query() q: AuditQueryDto) {
    return this.admin.auditLog(q);
  }
}
