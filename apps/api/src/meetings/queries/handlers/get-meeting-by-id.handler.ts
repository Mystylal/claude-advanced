import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingResult } from '../../interfaces/meeting-result.interface';
import { GetMeetingByIdQuery } from '../impl/get-meeting-by-id.query';

@QueryHandler(GetMeetingByIdQuery)
export class GetMeetingByIdHandler implements IQueryHandler<
  GetMeetingByIdQuery,
  MeetingResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id }: GetMeetingByIdQuery): Promise<MeetingResult> {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return meeting;
  }
}
