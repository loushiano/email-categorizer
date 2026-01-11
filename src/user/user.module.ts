import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserCredential } from './userCredendtial.entity';
import { UserEmailCategory } from './userEmailCategory.entity';
import { UserIncomingEmail } from './userIncomingEmail.entity';
import { UserService } from './user.service';
import { UsersController } from './user.controller';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserCredential,
      UserEmailCategory,
      UserIncomingEmail,
    ]),
    QueueModule,
  ],
  providers: [UserService],
  controllers: [UsersController],
  exports: [UserService],
})
export class UsersModule {}
