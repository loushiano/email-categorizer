import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { QueuePublisher } from '../queue/queue.publisher';
import { Events } from '../queue/queue-constants';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class CronPlanner {
  private logger = new Logger(CronPlanner.name);
  constructor(
    private readonly queuePublisher: QueuePublisher,
    @InjectEntityManager()
    private entityManager: EntityManager,
    private cache: CacheService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  public async renewWatch() {
    this.logger.log('renewing watchers');
    if (await this.cache.getData('RENEW_WATCH_KEY')) {
      this.logger.log('previous watch renewal in progress! will skip');
      return;
    }
    const query = this.entityManager.connection.createQueryRunner();
    try {
      await this.cache.setData('RENEW_WATCH_KEY', '1', 1800);
      const twoDaysAgo = new Date().valueOf() - 24 * 2 * 60 * 60 * 1000;
      const results = await query.query(
        `select uc.inbox_email from user_credentials uc inner join users u on u.id = uc.user_id where u.status = 'valid' and ${twoDaysAgo} > watcher_date`,
      );
      for (const { inbox_email } of results) {
        this.logger.log(`publishing renew watch event for user ${inbox_email}`);
        await this.queuePublisher.publish(Events.RENEW_WATCH, {
          inbox_email: inbox_email,
        });
      }
    } catch (error) {
      this.logger.error('error renewing watchers');
      this.logger.error(error);
    } finally {
      await this.cache.evictData('RENEW_WATCH_KEY');
      query.release();
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  public async renewTokens() {
    this.logger.log('renewing expiring tokens');
    if (await this.cache.getData('RENEW_TOKEN_KEY')) {
      this.logger.log('previous token renewal in progress! will skip');
      return;
    }
    const query = this.entityManager.connection.createQueryRunner();
    try {
      await this.cache.setData('RENEW_TOKEN_KEY', '1', 3600);
      // Get credentials expiring in the next 10 minutes
      const tenMinutesFromNow = new Date().valueOf() + 10 * 60 * 1000;
      const results = await query.query(
        `select uc.inbox_email from user_credentials uc inner join users u on u.id = uc.user_id where u.status = 'valid' and expiry_date < ${tenMinutesFromNow} and expiry_date > ${new Date().valueOf()}`,
      );
      console.log(results);
      for (const { inbox_email } of results) {
        this.logger.log(`publishing renew token event for user ${inbox_email}`);
        await this.queuePublisher.publish(Events.RENEW_TOKEN, { inbox_email });
      }
    } catch (error) {
      this.logger.error('error renewing tokens');
      this.logger.error(error);
    } finally {
      await this.cache.evictData('RENEW_TOKEN_KEY');
      query.release();
    }
  }
}
