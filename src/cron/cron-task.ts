import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { QueuePublisher } from '../queue/queue.publisher';
import { Events } from '../queue/queue-constants';
import { CacheService } from '../cache/cache.service';
import { UserService } from '../user/user.service';

@Injectable()
export class CronPlanner {
  private logger = new Logger(CronPlanner.name);
  constructor(
    private readonly queuePublisher: QueuePublisher,
    @InjectEntityManager()
    private entityManager: EntityManager,
    private cache: CacheService,
    private userService: UserService,
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

  @Cron(CronExpression.EVERY_MINUTE)
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

  @Cron(CronExpression.EVERY_5_MINUTES)
  public async retryFailedEmailProcessing() {
    this.logger.log('checking for failed emails to retry');
    if (await this.cache.getData('RETRY_FAILED_EMAILS_KEY')) {
      this.logger.log('previous retry job in progress! will skip');
      return;
    }
    try {
      await this.cache.setData('RETRY_FAILED_EMAILS_KEY', '1', 300);

      // Find failed emails that haven't been retried yet (max 1 retry attempt)
      // and were processed more than 5 minutes ago
      const failedEmails = await this.userService.findFailedEmailsForRetry(5);

      this.logger.log(`Found ${failedEmails.length} failed emails to retry`);

      for (const email of failedEmails) {
        this.logger.log(
          `Requeueing failed email ${email.id} (attempt ${email.processingAttempts + 1})`,
        );
        await this.queuePublisher.publish(Events.PROCESS_INCOMING_EMAIL, {
          incomingEmailId: email.id,
        });
      }
    } catch (error) {
      this.logger.error('error retrying failed emails');
      this.logger.error(error);
    } finally {
      await this.cache.evictData('RETRY_FAILED_EMAILS_KEY');
    }
  }
}
