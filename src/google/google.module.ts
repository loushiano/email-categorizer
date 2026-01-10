import { Module } from '@nestjs/common';

import { GoogleSerivce } from './google.service';
import { GoogleController } from './google.controller';
import { UsersModule } from '../user/user.module';
import { QueueModule } from '../queue/queue.module';
import { GoogleQueueHandler } from './google-queue.handler';

@Module({
  imports: [UsersModule, QueueModule],
  providers: [GoogleSerivce],
  exports: [GoogleSerivce],
  controllers: [GoogleController],
})
export class GoogleModule {
  constructor(private readonly googleService: GoogleQueueHandler) {}
  async onModuleInit() {
    this.googleService.subscribe(
      'projects/fozitto-store/subscriptions/gmail_emails-sub',
    );
  }
}
