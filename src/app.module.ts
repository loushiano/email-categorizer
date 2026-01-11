import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import dbConfiguration from './db/database';
import { UsersModule } from './user/user.module';
import { QueueModule } from './queue/queue.module';
import { GoogleModule } from './google/google.module';
import { CronModule } from './cron/cron.module';
import { LlmIntegrationModule } from './llm-integration';
import { CachingModule } from './cache/cache.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './authentication/jwt-auth.gard';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.override', '.env', '.env.aws'],
      load: [dbConfiguration],
    }), // .env.override takes priority when duplicates exist
    TypeOrmModule.forRootAsync({
      // TODO: Take out to ormconfig.js or config file
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    UsersModule,
    QueueModule,
    GoogleModule,
    CronModule,
    LlmIntegrationModule,
    CachingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
