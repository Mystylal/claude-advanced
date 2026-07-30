import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { CreateMeetingCommand } from './commands/impl/create-meeting.command';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingResult } from './interfaces/meeting-result.interface';
import { GetMeetingQuery } from './queries/impl/get-meeting.query';
import { ListMeetingsQuery } from './queries/impl/list-meetings.query';

@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateMeetingDto,
  ): Promise<MeetingResult> {
    return this.commandBus.execute(
      new CreateMeetingCommand(
        request.user.userId,
        dto.title,
        dto.date,
        dto.participants,
      ),
    );
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest): Promise<MeetingResult[]> {
    return this.queryBus.execute(new ListMeetingsQuery(request.user.userId));
  }

  @Get(':id')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<MeetingResult> {
    return this.queryBus.execute(new GetMeetingQuery(request.user.userId, id));
  }
}
