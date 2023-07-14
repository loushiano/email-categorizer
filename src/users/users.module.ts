import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from 'src/events/events.module';
import { HelpersModule } from 'src/helpers/helpers.module';
import { StripeModule } from 'src/stripe/stripe.module';
import { UserController } from './user.controller';
import { User } from './user.entity';
import { UserProfile } from './user.mapper';
import { UsersService } from './users.service';
import { RoleModule } from 'src/roles/role.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    HelpersModule,
    StripeModule,
    EventsModule,
    RoleModule
  ],
  providers: [UsersService, UserProfile],
  controllers: [UserController],
  exports: [UsersService],
})
export class UsersModule {}
