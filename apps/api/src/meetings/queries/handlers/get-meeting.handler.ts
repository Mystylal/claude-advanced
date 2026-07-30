import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingResult } from '../../interfaces/meeting-result.interface';
import { GetMeetingQuery } from '../impl/get-meeting.query';

@QueryHandler(GetMeetingQuery)
export class GetMeetingHandler implements IQueryHandler<
  GetMeetingQuery,
  MeetingResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ ownerId, id }: GetMeetingQuery): Promise<MeetingResult> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id, ownerId },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return meeting;
  }
}
