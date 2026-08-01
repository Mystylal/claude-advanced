import { unlink } from 'fs/promises';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { GetMeetingByIdQuery } from '../../../meetings/queries/impl/get-meeting-by-id.query';
import { MeetingResult } from '../../../meetings/interfaces/meeting-result.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { assertMeetingAccess } from '../../access/assert-meeting-access';
import { MeetingFileResult } from '../../interfaces/meeting-file-result.interface';
import { UploadMeetingFileCommand } from '../impl/upload-meeting-file.command';

@CommandHandler(UploadMeetingFileCommand)
export class UploadMeetingFileHandler implements ICommandHandler<
  UploadMeetingFileCommand,
  MeetingFileResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute({
    meetingId,
    userId,
    email,
    file,
  }: UploadMeetingFileCommand): Promise<MeetingFileResult> {
    try {
      const meeting = await this.queryBus.execute<
        GetMeetingByIdQuery,
        MeetingResult
      >(new GetMeetingByIdQuery(meetingId));

      assertMeetingAccess(meeting, userId, email);

      return await this.prisma.meetingFile.create({
        data: {
          meetingId,
          name: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          storagePath: file.path,
          uploadedBy: userId,
        },
        select: {
          id: true,
          meetingId: true,
          name: true,
          mimeType: true,
          size: true,
          uploadedBy: true,
          uploadedAt: true,
          status: true,
        },
      });
    } catch (error) {
      // multer's diskStorage has already written the file by the time this
      // handler runs, so a rejected/failed upload must clean it up itself
      // or it leaks orphaned files on every 403/404.
      await unlink(file.path).catch(() => undefined);
      throw error;
    }
  }
}
