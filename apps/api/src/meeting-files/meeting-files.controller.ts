import { createReadStream, existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  StreamableFile,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { DeleteMeetingFileCommand } from './commands/impl/delete-meeting-file.command';
import { UploadMeetingFileCommand } from './commands/impl/upload-meeting-file.command';
import {
  MAX_FILE_SIZE_BYTES,
  isAllowedMimeType,
} from './config/file-upload.constants';
import { MeetingFileRecord } from './interfaces/meeting-file-record.interface';
import { MeetingFileResult } from './interfaces/meeting-file-result.interface';
import { GetMeetingFileQuery } from './queries/impl/get-meeting-file.query';
import { ListMeetingFilesQuery } from './queries/impl/list-meeting-files.query';
import { buildAttachmentDisposition } from './util/build-content-disposition';
import { decodeOriginalFilename } from './util/decode-original-filename';

const STORAGE_DIR = join(process.cwd(), 'storage', 'meeting-files');

if (!existsSync(STORAGE_DIR)) {
  mkdirSync(STORAGE_DIR, { recursive: true });
}

@UseGuards(JwtAuthGuard)
@Controller('meetings/:meetingId/files')
export class MeetingFilesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: STORAGE_DIR,
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        file.originalname = decodeOriginalFilename(file.originalname);

        if (!isAllowedMimeType(file.mimetype)) {
          callback(
            new UnsupportedMediaTypeException(
              `Unsupported file type: ${file.mimetype}`,
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  upload(
    @Req() request: AuthenticatedRequest,
    @Param('meetingId') meetingId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MeetingFileResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.commandBus.execute(
      new UploadMeetingFileCommand(
        meetingId,
        request.user.userId,
        request.user.email,
        file,
      ),
    );
  }

  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Param('meetingId') meetingId: string,
  ): Promise<MeetingFileResult[]> {
    return this.queryBus.execute(
      new ListMeetingFilesQuery(
        meetingId,
        request.user.userId,
        request.user.email,
      ),
    );
  }

  @Get(':fileId')
  async download(
    @Req() request: AuthenticatedRequest,
    @Param('meetingId') meetingId: string,
    @Param('fileId') fileId: string,
  ): Promise<StreamableFile> {
    const file = await this.queryBus.execute<
      GetMeetingFileQuery,
      MeetingFileRecord
    >(
      new GetMeetingFileQuery(
        meetingId,
        fileId,
        request.user.userId,
        request.user.email,
      ),
    );

    return new StreamableFile(createReadStream(file.storagePath), {
      type: file.mimeType,
      disposition: buildAttachmentDisposition(file.name),
      length: file.size,
    });
  }

  @Delete(':fileId')
  @HttpCode(204)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('meetingId') meetingId: string,
    @Param('fileId') fileId: string,
  ): Promise<void> {
    return this.commandBus.execute(
      new DeleteMeetingFileCommand(meetingId, fileId, request.user.userId),
    );
  }
}
