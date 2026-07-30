import { ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { hash } from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRecord } from '../../interfaces/user-record.interface';
import { CreateUserCommand } from '../impl/create-user.command';

const SALT_ROUNDS = 10;

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<
  CreateUserCommand,
  UserRecord
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ email, password }: CreateUserCommand): Promise<UserRecord> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await hash(password, SALT_ROUNDS);
    return this.prisma.user.create({
      data: { email, password: hashedPassword },
    });
  }
}
