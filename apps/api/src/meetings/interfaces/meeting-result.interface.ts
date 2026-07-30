export interface MeetingResult {
  id: string;
  title: string;
  date: Date;
  participants: string[];
  ownerId: string;
  createdAt: Date;
}
