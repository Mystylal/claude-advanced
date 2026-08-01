import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { DeleteMeetingFileHandler } from './commands/handlers/delete-meeting-file.handler';
import { UploadMeetingFileHandler } from './commands/handlers/upload-meeting-file.handler';
import { MeetingFilesController } from './meeting-files.controller';
import { GetMeetingFileHandler } from './queries/handlers/get-meeting-file.handler';
import { ListMeetingFilesHandler } from './queries/handlers/list-meeting-files.handler';

const CommandHandlers = [UploadMeetingFileHandler, DeleteMeetingFileHandler];
const QueryHandlers = [ListMeetingFilesHandler, GetMeetingFileHandler];

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [MeetingFilesController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class MeetingFilesModule {}
