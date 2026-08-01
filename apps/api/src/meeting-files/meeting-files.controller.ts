import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
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
import { UploadMeetingFileCommand } from './commands/impl/upload-meeting-file.command';
import { MeetingFileResult } from './interfaces/meeting-file-result.interface';
import { ListMeetingFilesQuery } from './queries/impl/list-meeting-files.query';

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
}
