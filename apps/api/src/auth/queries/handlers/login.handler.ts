import { UnauthorizedException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { UserRecord } from '../../../users/interfaces/user-record.interface';
import { FindUserByEmailQuery } from '../../../users/queries/impl/find-user-by-email.query';
import { AuthResult } from '../../interfaces/auth-result.interface';
import { LoginQuery } from '../impl/login.query';

@QueryHandler(LoginQuery)
export class LoginHandler implements IQueryHandler<LoginQuery, AuthResult> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly jwtService: JwtService,
  ) {}

  async execute({ email, password }: LoginQuery): Promise<AuthResult> {
    const user = await this.queryBus.execute<
      FindUserByEmailQuery,
      UserRecord | null
    >(new FindUserByEmailQuery(email));
    const isPasswordValid = user
      ? await compare(password, user.password)
      : false;

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
      }),
    };
  }
}
