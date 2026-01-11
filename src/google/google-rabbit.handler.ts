import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { Events, getListening } from '../queue/queue-constants';
import { GoogleSerivce } from './google.service';
import { Public } from 'src/utils/constants';
import { UserService } from '../user/user.service';

@Injectable()
export class GoogleRabbitHandler {
  private readonly logger = new Logger(GoogleRabbitHandler.name);

  constructor(
    private readonly googleService: GoogleSerivce,
    private readonly userService: UserService,
  ) {}

  @RabbitSubscribe(getListening(Events.RENEW_WATCH))
  @Public()
  async handleRenewWatch(payload: { inbox_email: string }) {
    try {
      this.logger.log(`Renewing watch for user ${payload.inbox_email}`);
      await this.googleService.renewWatch(payload.inbox_email);
      this.logger.log(
        `Successfully renewed watch for user ${payload.inbox_email}`,
      );
    } catch (error) {
      this.logger.error(
        `Error renewing watch for user ${payload.inbox_email}`,
        error,
      );
    }
  }

  @RabbitSubscribe(getListening(Events.RENEW_TOKEN))
  @Public()
  async handleRenewToken(payload: { inbox_email: string }) {
    try {
      this.logger.log(`Renewing token for credential ${payload.inbox_email}`);
      await this.googleService.renewTokenByInboxEmail(payload.inbox_email);
      this.logger.log(
        `Successfully renewed token for credential ${payload.inbox_email}`,
      );
    } catch (error) {
      this.logger.error(
        `Error renewing token for credential ${payload.inbox_email}`,
        error,
      );
    }
  }

  @RabbitSubscribe(getListening(Events.DELETE_GMAIL_MESSAGE))
  @Public()
  async handleDeleteGmailMessage(payload: {
    messageId: string;
    credentialId: string;
  }) {
    try {
      this.logger.log(`Deleting Gmail message ${payload.messageId}`);

      // Get credential
      const credential = await this.userService.findCredentialById(
        payload.credentialId,
      );

      if (!credential) {
        this.logger.warn(
          `Credential ${payload.credentialId} not found, skipping Gmail deletion`,
        );
        return;
      }

      // Get access token
      const accessToken =
        await this.googleService.getAccessTokenForCredential(credential);

      if (!accessToken) {
        this.logger.error(
          `Failed to get access token for credential ${payload.credentialId}`,
        );
        return;
      }

      // Delete from Gmail
      const success = await this.googleService.trashMessage(
        accessToken,
        payload.messageId,
      );

      if (success) {
        this.logger.log(`Successfully deleted Gmail message ${payload.messageId}`);
      } else {
        this.logger.error(`Failed to delete Gmail message ${payload.messageId}`);
      }
    } catch (error) {
      this.logger.error(
        `Error deleting Gmail message ${payload.messageId}`,
        error,
      );
    }
  }
}
