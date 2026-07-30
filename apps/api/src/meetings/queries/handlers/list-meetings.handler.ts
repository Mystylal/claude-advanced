import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingResult } from '../../interfaces/meeting-result.interface';
import { ListMeetingsQuery } from '../impl/list-meetings.query';

@QueryHandler(ListMeetingsQuery)
export class ListMeetingsHandler implements IQueryHandler<
  ListMeetingsQuery,
  MeetingResult[]
> {
  constructor(private readonly prisma: PrismaService) {}

  execute({ ownerId }: ListMeetingsQuery): Promise<MeetingResult[]> {
    return this.prisma.meeting.findMany({ where: { ownerId } });
  }
}
