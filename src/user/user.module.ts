import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserProfile } from './user.mapper';
import { UsersController } from './user.controller';
import { StripeModule } from '../stripe/stripe.module';
import { RabbitModule } from '../queue/queue.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), StripeModule, RabbitModule],
  providers: [UserService, UserProfile],
  controllers: [UsersController],
  exports: [UserService],
})
export class UsersModule {}
