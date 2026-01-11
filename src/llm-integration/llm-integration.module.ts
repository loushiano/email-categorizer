import { Module } from '@nestjs/common';
import { ClaudeService } from './claude.service';
import { LlmRabbitHandler } from './llm-rabbit.handler';
import { UsersModule } from '../user/user.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [UsersModule, QueueModule],
  providers: [ClaudeService, LlmRabbitHandler],
  exports: [ClaudeService],
})
export class LlmIntegrationModule {}
