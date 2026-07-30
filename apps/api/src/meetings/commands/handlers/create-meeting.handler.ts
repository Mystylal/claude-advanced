import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingResult } from '../../interfaces/meeting-result.interface';
import { CreateMeetingCommand } from '../impl/create-meeting.command';

@CommandHandler(CreateMeetingCommand)
export class CreateMeetingHandler implements ICommandHandler<
  CreateMeetingCommand,
  MeetingResult
> {
  constructor(private readonly prisma: PrismaService) {}

  execute({
    ownerId,
    title,
    date,
    participants,
  }: CreateMeetingCommand): Promise<MeetingResult> {
    return this.prisma.meeting.create({
      data: { ownerId, title, date: new Date(date), participants },
    });
  }
}
