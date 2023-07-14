import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelpersModule } from 'src/helpers/helpers.module';
import { Event } from './event.entity';
import { EventService } from './event.service';
import { EventsController } from './events.controller';

@Module({
  imports: [HelpersModule, TypeOrmModule.forFeature([Event])],
  providers: [EventService],
  exports: [EventService],
  controllers: [EventsController],
})
export class EventsModule {}
