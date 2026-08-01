import { unlink } from 'fs/promises';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { GetMeetingByIdQuery } from '../../../meetings/queries/impl/get-meeting-by-id.query';
import { MeetingResult } from '../../../meetings/interfaces/meeting-result.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { assertMeetingOwner } from '../../access/assert-meeting-owner';
import { DeleteMeetingFileCommand } from '../impl/delete-meeting-file.command';

@CommandHandler(DeleteMeetingFileCommand)
export class DeleteMeetingFileHandler implements ICommandHandler<
  DeleteMeetingFileCommand,
  void
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute({
    meetingId,
    fileId,
    userId,
  }: DeleteMeetingFileCommand): Promise<void> {
    const meeting = await this.queryBus.execute<
      GetMeetingByIdQuery,
      MeetingResult
    >(new GetMeetingByIdQuery(meetingId));

    assertMeetingOwner(meeting, userId);

    const file = await this.prisma.meetingFile.findFirst({
      where: { id: fileId, meetingId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    await this.prisma.meetingFile.delete({ where: { id: fileId } });
    await unlink(file.storagePath).catch(() => undefined);
  }
}
