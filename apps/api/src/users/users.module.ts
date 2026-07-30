import { Module } from '@nestjs/common';
import { CreateUserHandler } from './commands/handlers/create-user.handler';
import { FindUserByEmailHandler } from './queries/handlers/find-user-by-email.handler';

const CommandHandlers = [CreateUserHandler];
const QueryHandlers = [FindUserByEmailHandler];

@Module({
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class UsersModule {}
