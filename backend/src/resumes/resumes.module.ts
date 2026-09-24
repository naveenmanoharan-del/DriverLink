import { Global, Module } from '@nestjs/common';
import { ResumesService } from './resumes.service';

@Global()
@Module({
  providers: [ResumesService],
  exports: [ResumesService],
})
export class ResumesModule {}
