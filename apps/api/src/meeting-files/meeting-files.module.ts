import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { UploadMeetingFileHandler } from './commands/handlers/upload-meeting-file.handler';
import { MeetingFilesController } from './meeting-files.controller';
import { ListMeetingFilesHandler } from './queries/handlers/list-meeting-files.handler';

const CommandHandlers = [UploadMeetingFileHandler];
const QueryHandlers = [ListMeetingFilesHandler];

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [MeetingFilesController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class MeetingFilesModule {}
