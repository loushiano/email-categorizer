import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from 'src/events/events.module';
import { HelpersModule } from 'src/helpers/helpers.module';
import { RoleEntity } from './role.entity';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { RoleProfile } from './role.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity]),
    HelpersModule,
    EventsModule,
  ],
  providers: [RoleService, RoleProfile],
  controllers: [RoleController],
  exports: [RoleService],
})
export class RoleModule {}
