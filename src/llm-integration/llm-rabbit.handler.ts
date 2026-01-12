import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { Events, getListening } from '../queue/queue-constants';
import { ClaudeService } from './claude.service';
import { UserService } from '../user/user.service';
import {
  Public,
  UnsubscribeStatus,
  EmailProcessingStatus,
} from 'src/utils/constants';

@Injectable()
export class LlmRabbitHandler {
  private readonly logger = new Logger(LlmRabbitHandler.name);

  // Queue for sequential unsubscribe processing (rate limiting)
  private unsubscribeQueue: Array<{ emailId: string; resolve: () => void }> = [];
  private isProcessingUnsubscribe = false;

  constructor(
    private readonly claudeService: ClaudeService,
    private readonly userService: UserService,
  ) {}

  @RabbitSubscribe(getListening(Events.PROCESS_INCOMING_EMAIL))
  @Public()
  async handleProcessIncomingEmail(payload: { incomingEmailId: string }) {
    const { incomingEmailId } = payload;

    try {
      this.logger.log(`Processing incoming email: ${incomingEmailId}`);

      // Fetch the incoming email with credential and user relation
      const email = await this.userService.findIncomingEmailById(
        incomingEmailId,
        ['credential', 'credential.user'],
      );

      if (!email) {
        this.logger.warn(`Email not found: ${incomingEmailId}`);
        return;
      }

      if (email.isProcessed) {
        this.logger.log(`Email already processed: ${incomingEmailId}`);
        return;
      }

      // Set status to processing and increment attempts
      await this.userService.updateIncomingEmailProcessingStatus(
        incomingEmailId,
        EmailProcessingStatus.PROCESSING,
        true,
      );

      // Fetch categories for this user
      const categories = await this.userService.findAllEmailCategoriesByUserId(
        email.credential.user.id,
      );

      // Analyze the email using Claude
      const analysisResult = await this.claudeService.analyzeEmail(
        email.htmlText,
        email.text,
        email.subject,
        categories.map((c) => ({ name: c.name, description: c.description })),
      );

      this.logger.log(
        `Analysis result for ${incomingEmailId}: category=${analysisResult.categoryName}, hasUnsubscribe=${analysisResult.hasUnsubscribe}`,
      );

      // Find the category if one was matched
      let matchedCategory = null;
      if (analysisResult.categoryName) {
        matchedCategory = categories.find(
          (c) =>
            c.name.toLowerCase() === analysisResult.categoryName.toLowerCase(),
        );
      }

      // Update the email with analysis results
      await this.userService.updateIncomingEmailAnalysis(incomingEmailId, {
        summary: analysisResult.summary,
        hasUnsubscribe: analysisResult.hasUnsubscribe,
        category: matchedCategory,
        isProcessed: true,
      });

      this.logger.log(`Successfully processed email: ${incomingEmailId}`);
    } catch (error) {
      this.logger.error(
        `Error processing incoming email ${incomingEmailId}:`,
        error,
      );
      // Set status to failed on error
      try {
        await this.userService.updateIncomingEmailProcessingStatus(
          incomingEmailId,
          EmailProcessingStatus.FAILED,
          false,
        );
      } catch (updateError) {
        this.logger.error(
          `Failed to update processing status for ${incomingEmailId}:`,
          updateError,
        );
      }
    }
  }

  @RabbitSubscribe(getListening(Events.UNSUBSCRIBE_EMAIL))
  @Public()
  async handleUnsubscribeEmail(payload: { emailId: string }) {
    const { emailId } = payload;

    // Add to queue and wait for turn
    await this.enqueueUnsubscribe(emailId);
  }

  private async enqueueUnsubscribe(emailId: string): Promise<void> {
    return new Promise((resolve) => {
      this.unsubscribeQueue.push({ emailId, resolve });
      this.logger.log(
        `Queued unsubscribe for email: ${emailId} (queue size: ${this.unsubscribeQueue.length})`,
      );
      this.processUnsubscribeQueue();
    });
  }

  private async processUnsubscribeQueue(): Promise<void> {
    if (this.isProcessingUnsubscribe || this.unsubscribeQueue.length === 0) {
      return;
    }

    this.isProcessingUnsubscribe = true;
    const { emailId, resolve } = this.unsubscribeQueue.shift()!;

    try {
      this.logger.log(
        `Processing unsubscribe for email: ${emailId} (remaining in queue: ${this.unsubscribeQueue.length})`,
      );

      // Fetch the email
      const email = await this.userService.findIncomingEmailById(emailId, [
        'credential',
      ]);

      if (!email) {
        this.logger.warn(`Email not found for unsubscribe: ${emailId}`);
        return;
      }

      if (!email.hasUnsubscribe) {
        this.logger.warn(`Email ${emailId} does not have unsubscribe option`);
        await this.userService.updateIncomingEmailUnsubscribeStatus(
          emailId,
          UnsubscribeStatus.FAILED,
        );
        return;
      }

      // Set status to processing
      await this.userService.updateIncomingEmailUnsubscribeStatus(
        emailId,
        UnsubscribeStatus.PROCESSING,
      );

      // Execute unsubscribe using Claude
      const result = await this.claudeService.executeUnsubscribe(
        email.htmlText,
        email.subject,
        email.from,
      );

      this.logger.log(
        `Unsubscribe result for ${emailId}: success=${result.success}, steps=${result.stepsExecuted}, message=${result.message}`,
      );

      if (result.success) {
        await this.userService.updateIncomingEmailUnsubscribeStatus(
          emailId,
          UnsubscribeStatus.COMPLETED,
        );
        this.logger.log(`Successfully unsubscribed from email: ${emailId}`);
      } else {
        await this.userService.updateIncomingEmailUnsubscribeStatus(
          emailId,
          UnsubscribeStatus.FAILED,
        );
        this.logger.warn(
          `Failed to unsubscribe from email ${emailId}: ${result.message}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error processing unsubscribe for ${emailId}:`, error);
      // Set status to failed on error
      try {
        await this.userService.updateIncomingEmailUnsubscribeStatus(
          emailId,
          UnsubscribeStatus.FAILED,
        );
      } catch (updateError) {
        this.logger.error(
          `Failed to update unsubscribe status for ${emailId}:`,
          updateError,
        );
      }
    } finally {
      resolve();
      this.isProcessingUnsubscribe = false;
      // Process next item in queue
      this.processUnsubscribeQueue();
    }
  }
}
