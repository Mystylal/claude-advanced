import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler, QueryBus } from '@nestjs/cqrs';
import { GetMeetingByIdQuery } from '../../../meetings/queries/impl/get-meeting-by-id.query';
import { MeetingResult } from '../../../meetings/interfaces/meeting-result.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { assertMeetingAccess } from '../../access/assert-meeting-access';
import { MeetingFileRecord } from '../../interfaces/meeting-file-record.interface';
import { GetMeetingFileQuery } from '../impl/get-meeting-file.query';

@QueryHandler(GetMeetingFileQuery)
export class GetMeetingFileHandler implements IQueryHandler<
  GetMeetingFileQuery,
  MeetingFileRecord
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute({
    meetingId,
    fileId,
    userId,
    email,
  }: GetMeetingFileQuery): Promise<MeetingFileRecord> {
    const meeting = await this.queryBus.execute<
      GetMeetingByIdQuery,
      MeetingResult
    >(new GetMeetingByIdQuery(meetingId));

    assertMeetingAccess(meeting, userId, email);

    const file = await this.prisma.meetingFile.findFirst({
      where: { id: fileId, meetingId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }
}
