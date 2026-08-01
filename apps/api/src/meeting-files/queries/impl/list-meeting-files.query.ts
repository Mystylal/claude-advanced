export class ListMeetingFilesQuery {
  constructor(
    public readonly meetingId: string,
    public readonly userId: string,
    public readonly email: string,
  ) {}
}
