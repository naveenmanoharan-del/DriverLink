import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  RESUME_UPLOAD_OPTIONS,
  ResumesService,
} from '../resumes/resumes.service';
import { detailsTable, MailService } from '../mail/mail.service';
import { publicProfile } from './public-profile';
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
  constructor(
    private readonly workers: WorkersService,
    private readonly resumes: ResumesService,
    private readonly mail: MailService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('worker')
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return publicProfile(await this.workers.findByUserId(user.userId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('worker')
  @Put('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateWorkerProfileDto,
  ) {
    return publicProfile(await this.workers.updateByUserId(user.userId, dto));
  }

  /** Metadata of the uploaded resume, or null when there isn't one. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('worker')
  @Get('me/resume')
  async myResume(@CurrentUser() user: AuthUser) {
    const profile = await this.workers.findByUserId(user.userId);
    return this.resumes.findMeta(profile.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('worker')
  @Get('me/resume/file')
  async myResumeFile(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const profile = await this.workers.findByUserId(user.userId);
    const file = await this.resumes.findFile(profile.id);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.fileName)}"`,
    });
    res.send(file.data);
  }

  /** Uploads or replaces the resume, and emails it to the site owner. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('worker')
  @Put('me/resume')
  @UseInterceptors(FileInterceptor('resume', RESUME_UPLOAD_OPTIONS))
  async uploadResume(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Attach a resume file');
    const profile = await this.workers.findByUserId(user.userId);
    const saved = await this.resumes.save(profile.id, file);
    const name = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(' ');
    void this.mail.notifyAdmin(
      `Resume uploaded: ${name}`,
      `<p style="font-family:sans-serif">A candidate uploaded a new resume.</p>` +
        detailsTable([
          ['Name', name],
          ['City', profile.city],
          ['Experience', `${profile.yearsExperience} years`],
        ]),
      [{ filename: file.originalname, content: file.buffer }],
    );
    return saved;
  }

  // Candidate data is personal, so browsing it needs an account: only clients
  // (who hire) and admins. It used to be public to anyone on the internet.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client', 'admin')
  @Get()
  async search(@Query() query: SearchWorkersDto) {
    const result = await this.workers.search(query);
    return { ...result, data: result.data.map(publicProfile) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client', 'admin')
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return publicProfile(await this.workers.findOne(id));
  }
}
