import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRecord } from '../../interfaces/user-record.interface';
import { FindUserByEmailQuery } from '../impl/find-user-by-email.query';

@QueryHandler(FindUserByEmailQuery)
export class FindUserByEmailHandler implements IQueryHandler<
  FindUserByEmailQuery,
  UserRecord | null
> {
  constructor(private readonly prisma: PrismaService) {}

  execute({ email }: FindUserByEmailQuery): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
