import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { CreateUserCommand } from '../../../users/commands/impl/create-user.command';
import { UserRecord } from '../../../users/interfaces/user-record.interface';
import { AuthResult } from '../../interfaces/auth-result.interface';
import { RegisterCommand } from '../impl/register.command';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<
  RegisterCommand,
  AuthResult
> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly jwtService: JwtService,
  ) {}

  async execute({ email, password }: RegisterCommand): Promise<AuthResult> {
    const user = await this.commandBus.execute<CreateUserCommand, UserRecord>(
      new CreateUserCommand(email, password),
    );

    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
      }),
    };
  }
}
