import { IQueryHandler, QueryHandler, QueryBus } from '@nestjs/cqrs';
import { GetMeetingByIdQuery } from '../../../meetings/queries/impl/get-meeting-by-id.query';
import { MeetingResult } from '../../../meetings/interfaces/meeting-result.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { assertMeetingAccess } from '../../access/assert-meeting-access';
import { MeetingFileResult } from '../../interfaces/meeting-file-result.interface';
import { ListMeetingFilesQuery } from '../impl/list-meeting-files.query';

@QueryHandler(ListMeetingFilesQuery)
export class ListMeetingFilesHandler implements IQueryHandler<
  ListMeetingFilesQuery,
  MeetingFileResult[]
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute({
    meetingId,
    userId,
    email,
  }: ListMeetingFilesQuery): Promise<MeetingFileResult[]> {
    const meeting = await this.queryBus.execute<
      GetMeetingByIdQuery,
      MeetingResult
    >(new GetMeetingByIdQuery(meetingId));

    assertMeetingAccess(meeting, userId, email);

    return this.prisma.meetingFile.findMany({
      where: { meetingId },
      orderBy: { uploadedAt: 'asc' },
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
  }
}
