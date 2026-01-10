import { Injectable, Logger } from '@nestjs/common';
import { PubSub } from '@google-cloud/pubsub';
import { GoogleSerivce } from '../google/google.service';

@Injectable()
export class GoogleQueueHandler {
  private readonly logger = new Logger(GoogleQueueHandler.name);
  constructor(private readonly goolgeService: GoogleSerivce) {}

  subscribe(subscriptionNameOrId) {
    const pubSubClient = new PubSub();

    const subscription = pubSubClient.subscription(subscriptionNameOrId);

    // Create an event handler to handle errors
    const errorHandler = (error) => {
      // Do something with the error
      this.logger.error(`ERROR: ${error}`);
      throw error;
    };
    this.logger.log('watching pub sub google');
    // Listen for new messages/errors until timeout is hit
    subscription.on(
      'message',
      this.goolgeService.messageHandler.bind(this.goolgeService),
    );
    subscription.on('error', errorHandler);
  }
}
