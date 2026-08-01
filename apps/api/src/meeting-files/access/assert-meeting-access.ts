import { ForbiddenException } from '@nestjs/common';
import { MeetingResult } from '../../meetings/interfaces/meeting-result.interface';

export function assertMeetingAccess(
  meeting: MeetingResult,
  userId: string,
  email: string,
): void {
  const hasAccess =
    meeting.ownerId === userId || meeting.participants.includes(email);

  if (!hasAccess) {
    throw new ForbiddenException('Not a participant of this meeting');
  }
}
