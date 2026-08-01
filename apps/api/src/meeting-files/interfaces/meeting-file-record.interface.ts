export interface MeetingFileRecord {
  id: string;
  meetingId: string;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: Date;
  status: string;
}
