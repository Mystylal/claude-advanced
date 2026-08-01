export class UploadMeetingFileCommand {
  constructor(
    public readonly meetingId: string,
    public readonly userId: string,
    public readonly email: string,
    public readonly file: Express.Multer.File,
  ) {}
}
