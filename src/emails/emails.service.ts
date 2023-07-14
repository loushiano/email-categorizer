import { HttpModule, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SendGrid from '@sendgrid/mail';
import { FilesService } from 'src/common/file/files.service';

export enum EmailType {
  RECEIPT = 'receipt',
  REJECTED = 'rejected',
  CANCELLATION = 'cancellation',
  SUBSCRIPTION = 'subscription',
  CONFIRMATION = 'order-confirm',
  SUBSCRIPTION_OWNER = 'subscription-owner',
  INFO = 'info',
  SUBSCRIPTION_ACCEPTED = 'subsc-accepted',
  SUBSCRIPTION_PICKED = 'subsc-picked',
  RECEIPT_PICK = 'receipt-pick',
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly fileService: FilesService,
  ) {
    SendGrid.setApiKey(this.configService.get<string>('SEND_GRID_KEY'));
  }

  typeMapper = {
    [EmailType.CANCELLATION]: 'Cancellation Email',
    [EmailType.RECEIPT]: 'Order Receipt',
    [EmailType.RECEIPT_PICK]: 'Order Receipt',
    [EmailType.REJECTED]: 'Order Rejected',
    [EmailType.SUBSCRIPTION_PICKED]: 'Order Update',
    [EmailType.SUBSCRIPTION]: 'Order Confirmation',
    [EmailType.SUBSCRIPTION_OWNER]: 'New Order',
    [EmailType.CONFIRMATION]: 'Order Confirmation',
    [EmailType.SUBSCRIPTION_ACCEPTED]: 'Order Update',
  };
  async send(
    email: string,
    type: EmailType,
    replaceString: { [key: string]: string },
  ) {
    try {
      if (process.env.NODE_ENV != 'production' || !email.includes('@')) {
        return;
      }
      let html = await this.fileService.getEmail(type);
      Object.entries(replaceString).forEach(([key, value]) => {
        html = html.replace(`@@${key}@@`, value);
      });
      const mail = {
        to: email,
        subject: `Halal Eat ${this.typeMapper[type] ?? type}`,
        from: {
          email: this.configService.get('FROM_EMAIL'),
          name: 'Halal Eat',
        },
        html: html,
      };
      const transport = await SendGrid.send(mail);

      this.logger.log(`Email ${type} successfully dispatched to ${mail.to}`);
      return transport;
    } catch (error) {
      this.logger.error('Error occured on getting email ', error);
    }
  }
}
