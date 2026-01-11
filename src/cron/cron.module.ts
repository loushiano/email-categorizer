import { Module } from '@nestjs/common';
import { CronPlanner } from './cron-task';
import { QueueModule } from '../queue/queue.module';
import { CachingModule } from '../cache/cache.module';

@Module({
  providers: [CronPlanner],
  exports: [],
  imports: [QueueModule, CachingModule],
})
export class CronModule {}
