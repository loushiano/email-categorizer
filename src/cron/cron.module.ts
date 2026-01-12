import { Module } from '@nestjs/common';
import { CronPlanner } from './cron-task';
import { QueueModule } from '../queue/queue.module';
import { CachingModule } from '../cache/cache.module';
import { UsersModule } from 'src/user/user.module';

@Module({
  providers: [CronPlanner],
  exports: [],
  imports: [QueueModule, CachingModule, UsersModule],
})
export class CronModule {}
