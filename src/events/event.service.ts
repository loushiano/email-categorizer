import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { Event } from './event.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
  ) {}

  async addEvent({
    userId,
    name,
    data,
  }: {
    userId: string;
    storeId?: string;
    name: string;
    data: { [key: string]: string };
    postId?: number;
  }) {
    let event = new Event();
    event.user = { id: userId } as User;

    event.eventName = name;
    event.data = JSON.stringify(data);
    try {
      await this.eventRepo.save(event);
    } catch (error) {}
  }
}
