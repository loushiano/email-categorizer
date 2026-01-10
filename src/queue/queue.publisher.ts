import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { Events, getQueueName, getRouteName } from './queue-constants';

@Injectable()
export class QueuePublisher {
  constructor(private readonly queue: AmqpConnection) {}

  public createQueue(event: Events) {
    this.queue.channel.assertQueue(getQueueName(event), {
      durable: true,
    });
    this.queue.channel.bindQueue(
      getQueueName(event),
      'exchange1',
      getRouteName(event),
    );
  }

  async publish(event: Events, data) {
    this.queue.publish('exchange1', getRouteName(event), data);
  }
}
