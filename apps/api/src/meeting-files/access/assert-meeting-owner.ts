import { ForbiddenException } from '@nestjs/common';
import { MeetingResult } from '../../meetings/interfaces/meeting-result.interface';

export function assertMeetingOwner(
  meeting: MeetingResult,
  userId: string,
): void {
  if (meeting.ownerId !== userId) {
    throw new ForbiddenException('Only the meeting owner can do this');
  }
}
