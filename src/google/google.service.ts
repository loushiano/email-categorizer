import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { OAuth2Client, auth } from 'google-auth-library';
import { google } from 'googleapis';
import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { UserCredential } from '../user/userCredendtial.entity';
import { EmailType, GoogleEmail, UserStatus } from '../utils/constants';
import {
  aboutToExpire,
  decodeBase64,
  decodeJWT,
  decrypt,
  encrypt,
  extractGoogleDomain,
  getBetweenDates,
  getHeader,
  validDomain,
} from '../utils/helper-util';
import { v4 as uuidv4 } from 'uuid';
import { QueuePublisher } from '../queue/queue.publisher';
import { Events } from '../queue/queue-constants';

@Injectable()
export class GoogleSerivce {
  private readonly logger = new Logger(GoogleSerivce.name);
  oauth2Client: OAuth2Client;
  scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.readonly',
  ];
  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private queueProducer: QueuePublisher,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT'),
    );
  }

  async messageHandler(message) {
    try {
      this.logger.log(`received a message from google`);
      const json = JSON.parse(Buffer.from(message.data).toString('utf8'));
      let user = await this.userService.findByEmail(json['emailAddress'], {}, [
        'credential',
      ]);
      if (user.status != UserStatus.VERIFIED || !user.credential) {
        message.ack();
        if (user.credential) {
          this.stopWatch(user);
        }
        return;
      }
      if (aboutToExpire(user.credential.expiryDate)) {
        user = await this.renewToken(user);
        if (!user) {
          message.ack();
          return;
        }
      }
      const tokens = JSON.parse(
        await new Promise((res, rej) => decrypt(user.credential.tokens, res)),
      );
      2;

      const gmail = await google.gmail('v1');
      const lastHistory = user.credential.lastHistoryId;

      user.credential.lastHistoryId = json.historyId;
      await this.userService.saveUser(user);
      if (!lastHistory) {
        message.ack();
        return;
      }
      const emails = await gmail.users.history.list(
        {
          userId: 'me',
          startHistoryId: lastHistory,
          labelId: 'INBOX',
        },
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      const history = emails.data.history || [];

      for (const record of history) {
        if (record.messagesAdded) {
          for (const message of record.messagesAdded) {
            const email = await this.getMessage(
              tokens.access_token,
              message.message.id,
              gmail,
            );
            const domain = extractGoogleDomain(email.from);
            if (validDomain(domain)) {
              this.queueProducer.publish(Events.CREATE_EMAIL, {
                from: domain,
                to: json['emailAddress'],
                textAsHtml: email.textAsHtml,
                text: email.text,
                creationDate: email.creationDate,
                messageId: message.message.id,
                subject: email.subject,
              });
            }
          }
        }
      }
    } catch (erro) {
      this.logger.error(
        `error occured with getting gmail message ${erro}`,
        erro,
      );
    }
    message.ack();
  }

  extractHtml(payload) {
    if (!payload || !payload.parts) {
      return '';
    }

    for (const part of payload.parts) {
      if (part.mimeType === 'text/html') {
        return Buffer.from(part.body.data, 'base64').toString('utf-8'); // Decode base64 HTML
      }

      // If the part has nested parts, recursively check them
      if (part.parts) {
        const html = this.extractHtml(part);
        if (html) return html;
      }
    }

    return '';
  }
  extractText(payload) {
    if (!payload || !payload.parts) {
      return '';
    }

    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain') {
        return Buffer.from(part.body.data, 'base64').toString('utf-8'); // Decode base64 HTML
      }

      // If the part has nested parts, recursively check them
      if (part.parts) {
        const html = this.extractText(part);
        if (html) return html;
      }
    }

    return '';
  }

  async getMessage(token, id, gmail) {
    const response = await gmail.users.messages.get(
      {
        userId: 'me',
        id,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return {
      id: response.data.id,
      subject: getHeader(response.data.payload.headers, 'Subject'),
      from: getHeader(response.data.payload.headers, 'From'),
      text: this.extractText(response.data.payload),
      textAsHtml: this.extractHtml(response.data.payload),
      creationDate: new Date(
        getHeader(response.data.payload.headers, 'Date'),
      ).valueOf(),
    };
  }

  async getGoogleAuth() {
    const array = new Uint32Array(10);
    const rand = crypto.getRandomValues(array).toString();
    const state = Buffer.from(rand, 'utf-8').toString('hex');
    const authorizationUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      /** Pass in the scopes array defined above.
       * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
      scope: this.scopes,
      // Enable incremental authorization. Recommended as a best practice.
      include_granted_scopes: true,
      // Include the state parameter to reduce the risk of CSRF attacks.
      state: state,
    });
    return { url: authorizationUrl };
  }

  async renewToken(user: User) {
    const oauth2Client = new OAuth2Client(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
    );
    const oldTokens = JSON.parse(await decrypt(user.credential.tokens));
    oauth2Client.setCredentials({ refresh_token: oldTokens.refresh_token });
    try {
      const tokens = await oauth2Client.refreshAccessToken();
      const newAccessToken = tokens.credentials.access_token;
      user.credential.tokens = await encrypt(
        JSON.stringify({
          access_token: newAccessToken,
          refresh_token: oldTokens.refresh_token,
        }),
      );
      user.credential.expiryDate = tokens.credentials.expiry_date;
      await this.userService.saveUser(user);
      return user;
    } catch (err) {
      // this means that we couldn't renew the token. so send an email here, and let them sign up again.
      user.status = UserStatus.PENDING;
      await this.userService.saveUser(user);
      this.queueProducer.publish(Events.SEND_EMAIL, {
        email: user.email,
        type: EmailType.AUTH,
        subject: 'Please renew your google account access',
        replaceString: { name: `${user.fname} ${user.fname}` },
      });
    }
  }

  async decode({ email }: { email: string }) {
    if (process.env.NODE_ENV == 'production') {
      return '';
    }
    let userDB = await this.userService.findByEmail(email, {}, ['credential']);
    if (aboutToExpire(userDB.credential.expiryDate)) {
      userDB = await this.renewToken(userDB);
    }
    return this.stopWatch(userDB);
  }
  async stopWatch(user: User) {
    const gmail = await google.gmail('v1');
    const tokens = JSON.parse(
      await new Promise((res, rej) => decrypt(user.credential.tokens, res)),
    );
    try {
      const res = await gmail.users.stop(
        { userId: 'me' },
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      return res.data;
    } catch (error) {}
  }

  async verifyCode(code: string) {
    let res;
    let tokens;
    try {
      tokens = (await this.oauth2Client.getToken(code)).tokens;
      const user = await google.oauth2('v2');
      res = await user.userinfo.get(
        {},
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
    } catch (error) {
      this.logger.error('user did not authorize us');
      return '';
    }
    const gmail = await google.gmail('v1');
    let succeeded = true;
    try {
      await gmail.users.watch(
        {
          userId: 'me',
          access_token: tokens.access_token,
          requestBody: {
            topicName: 'projects/fozitto-store/topics/gmail_emails',
            labelIds: ['INBOX'],
            labelFilterBehavior: 'INCLUDE',
          },
        },
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      this.logger.log('watcher done');
    } catch (error) {
      this.logger.error(`error for ${res.data.email}`, error);
      succeeded = false;
    }
    const userDB = await this.userService.findByEmail(res.data.email, {}, [
      'credential',
    ]);
    if (!userDB) {
      return '';
    }
    if (succeeded) {
      if (!userDB.credential) {
        userDB.credential = new UserCredential();
        userDB.credential.id = uuidv4();
      }

      userDB.credential.tokens = await new Promise((res, rej) =>
        encrypt(
          JSON.stringify({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          }),
          res,
        ),
      );
      userDB.credential.expiryDate = tokens.expiry_date;
      userDB.credential.watcherDate = new Date().valueOf();
      userDB.credential.user = userDB;
      userDB.inboxAccess = true;
      if (succeeded) {
        userDB.status = UserStatus.CARD_EXPECTED;
      }
      await this.userService.saveUser(userDB);
    }
    return 'done';
  }

  async renewWatch(id: string) {
    let userDB = await this.userService.findById(id, {}, ['credential']);
    if (aboutToExpire(userDB.credential.expiryDate)) {
      userDB = await this.renewToken(userDB);
      if (!userDB) {
        return;
      }
    }
    const gmail = await google.gmail('v1');
    const tokens = JSON.parse(
      await new Promise((res, rej) => decrypt(userDB.credential.tokens, res)),
    );
    if (process.env.NODE_ENV == 'production') {
      await gmail.users.watch(
        {
          userId: 'me',
          requestBody: {
            topicName: 'projects/fozitto-store/topics/gmail_emails',
            labelIds: ['INBOX'],
            labelFilterBehavior: 'INCLUDE',
          },
        },
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
    }
    userDB.credential.watcherDate = new Date().valueOf();
    await this.userService.saveUser(userDB);
  }
}
