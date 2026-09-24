import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import { resumes } from '../database/schema';

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/** Multer options for any route that accepts a `resume` file field. */
export const RESUME_UPLOAD_OPTIONS = {
  limits: { fileSize: MAX_RESUME_BYTES, files: 1 },
};

/**
 * Accepted formats, identified by their leading bytes rather than by the
 * browser-reported MIME type or extension, both of which the client controls.
 */
const FORMATS = [
  { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  // .docx is a zip container.
  {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    magic: [0x50, 0x4b, 0x03, 0x04],
  },
  // Legacy .doc is an OLE compound file.
  {
    mime: 'application/msword',
    magic: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  },
];

export interface UploadedResume {
  originalname: string;
  size: number;
  buffer: Buffer;
}

type Executor =
  Database | Parameters<Parameters<Database['transaction']>[0]>[0];

@Injectable()
export class ResumesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Throws a 400 unless the file is a non-empty PDF, DOC or DOCX. */
  validate(file: UploadedResume) {
    if (!file.size) throw new BadRequestException('The resume file is empty');
    const format = FORMATS.find((f) =>
      f.magic.every((byte, i) => file.buffer[i] === byte),
    );
    if (!format)
      throw new BadRequestException('Resume must be a PDF or Word document');
    return format.mime;
  }

  /** Stores the file as the worker's resume, replacing any earlier one. */
  async save(
    workerId: string,
    file: UploadedResume,
    executor: Executor = this.db,
  ) {
    const mimeType = this.validate(file);
    const values = {
      workerId,
      // Keep only the base name, and cap it to the column width.
      fileName: (file.originalname.split(/[\\/]/).pop() || 'resume').slice(
        -255,
      ),
      mimeType,
      sizeBytes: file.size,
      data: file.buffer,
    };
    const [row] = await executor
      .insert(resumes)
      .values(values)
      .onConflictDoUpdate({
        target: resumes.workerId,
        set: { ...values, updatedAt: sql`now()` },
      })
      .returning({
        fileName: resumes.fileName,
        mimeType: resumes.mimeType,
        sizeBytes: resumes.sizeBytes,
        updatedAt: resumes.updatedAt,
      });
    return row;
  }

  /** Metadata only — never loads the file bytes. */
  async findMeta(workerId: string) {
    const [row] = await this.db
      .select({
        fileName: resumes.fileName,
        mimeType: resumes.mimeType,
        sizeBytes: resumes.sizeBytes,
        updatedAt: resumes.updatedAt,
      })
      .from(resumes)
      .where(eq(resumes.workerId, workerId));
    return row ?? null;
  }

  async findFile(workerId: string) {
    const row = await this.db.query.resumes.findFirst({
      where: eq(resumes.workerId, workerId),
    });
    if (!row) throw new NotFoundException('No resume uploaded yet');
    return row;
  }
}
