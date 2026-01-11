import { Test, TestingModule } from '@nestjs/testing';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { QueuePublisher } from './queue.publisher';
import { Events, getQueueName, getRouteName } from './queue-constants';
import { createMockAmqpConnection } from '../test/test-utils';

describe('QueuePublisher', () => {
  let publisher: QueuePublisher;
  let amqpConnection: jest.Mocked<AmqpConnection>;

  beforeEach(async () => {
    const mockAmqpConnection = createMockAmqpConnection();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueuePublisher,
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
      ],
    }).compile();

    publisher = module.get<QueuePublisher>(QueuePublisher);
    amqpConnection = module.get(AmqpConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createQueue', () => {
    it('should create queue with correct name', () => {
      publisher.createQueue(Events.PROCESS_INCOMING_EMAIL);

      expect(amqpConnection.channel.assertQueue).toHaveBeenCalledWith(
        getQueueName(Events.PROCESS_INCOMING_EMAIL),
        { durable: true },
      );
    });

    it('should bind queue to exchange with correct route', () => {
      publisher.createQueue(Events.PROCESS_INCOMING_EMAIL);

      expect(amqpConnection.channel.bindQueue).toHaveBeenCalledWith(
        getQueueName(Events.PROCESS_INCOMING_EMAIL),
        'exchange1',
        getRouteName(Events.PROCESS_INCOMING_EMAIL),
      );
    });

    it('should create queue for RENEW_WATCH event', () => {
      publisher.createQueue(Events.RENEW_WATCH);

      expect(amqpConnection.channel.assertQueue).toHaveBeenCalledWith(
        'Q_email_agent-renew_watch',
        { durable: true },
      );
      expect(amqpConnection.channel.bindQueue).toHaveBeenCalledWith(
        'Q_email_agent-renew_watch',
        'exchange1',
        'R_email_agent-renew_watch',
      );
    });

    it('should create queue for RENEW_TOKEN event', () => {
      publisher.createQueue(Events.RENEW_TOKEN);

      expect(amqpConnection.channel.assertQueue).toHaveBeenCalledWith(
        'Q_email_agent-renew_token',
        { durable: true },
      );
    });

    it('should create queue for DELETE_GMAIL_MESSAGE event', () => {
      publisher.createQueue(Events.DELETE_GMAIL_MESSAGE);

      expect(amqpConnection.channel.assertQueue).toHaveBeenCalledWith(
        'Q_email_agent-delete_gmail_message',
        { durable: true },
      );
    });

    it('should create queue for UNSUBSCRIBE_EMAIL event', () => {
      publisher.createQueue(Events.UNSUBSCRIBE_EMAIL);

      expect(amqpConnection.channel.assertQueue).toHaveBeenCalledWith(
        'Q_email_agent-unsubscribe_email',
        { durable: true },
      );
    });
  });

  describe('publish', () => {
    it('should publish message to correct exchange and route', async () => {
      const payload = { incomingEmailId: 'email-123' };

      await publisher.publish(Events.PROCESS_INCOMING_EMAIL, payload);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'exchange1',
        getRouteName(Events.PROCESS_INCOMING_EMAIL),
        payload,
      );
    });

    it('should publish RENEW_WATCH event', async () => {
      const payload = { inbox_email: 'user@example.com' };

      await publisher.publish(Events.RENEW_WATCH, payload);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'exchange1',
        'R_email_agent-renew_watch',
        payload,
      );
    });

    it('should publish RENEW_TOKEN event', async () => {
      const payload = { inbox_email: 'user@example.com' };

      await publisher.publish(Events.RENEW_TOKEN, payload);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'exchange1',
        'R_email_agent-renew_token',
        payload,
      );
    });

    it('should publish DELETE_GMAIL_MESSAGE event', async () => {
      const payload = { messageId: 'msg-123', credentialId: 'cred-456' };

      await publisher.publish(Events.DELETE_GMAIL_MESSAGE, payload);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'exchange1',
        'R_email_agent-delete_gmail_message',
        payload,
      );
    });

    it('should publish UNSUBSCRIBE_EMAIL event', async () => {
      const payload = { emailId: 'email-789' };

      await publisher.publish(Events.UNSUBSCRIBE_EMAIL, payload);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'exchange1',
        'R_email_agent-unsubscribe_email',
        payload,
      );
    });

    it('should handle complex payload objects', async () => {
      const complexPayload = {
        emailId: 'email-123',
        metadata: {
          timestamp: Date.now(),
          retryCount: 0,
        },
        tags: ['newsletter', 'important'],
      };

      await publisher.publish(Events.PROCESS_INCOMING_EMAIL, complexPayload);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'exchange1',
        getRouteName(Events.PROCESS_INCOMING_EMAIL),
        complexPayload,
      );
    });
  });
});

describe('Queue Constants', () => {
  describe('getRouteName', () => {
    it('should generate correct route name for RENEW_WATCH', () => {
      expect(getRouteName(Events.RENEW_WATCH)).toBe('R_email_agent-renew_watch');
    });

    it('should generate correct route name for RENEW_TOKEN', () => {
      expect(getRouteName(Events.RENEW_TOKEN)).toBe('R_email_agent-renew_token');
    });

    it('should generate correct route name for PROCESS_INCOMING_EMAIL', () => {
      expect(getRouteName(Events.PROCESS_INCOMING_EMAIL)).toBe(
        'R_email_agent-process_incoming_email',
      );
    });

    it('should generate correct route name for DELETE_GMAIL_MESSAGE', () => {
      expect(getRouteName(Events.DELETE_GMAIL_MESSAGE)).toBe(
        'R_email_agent-delete_gmail_message',
      );
    });

    it('should generate correct route name for UNSUBSCRIBE_EMAIL', () => {
      expect(getRouteName(Events.UNSUBSCRIBE_EMAIL)).toBe('R_email_agent-unsubscribe_email');
    });
  });

  describe('getQueueName', () => {
    it('should generate correct queue name for RENEW_WATCH', () => {
      expect(getQueueName(Events.RENEW_WATCH)).toBe('Q_email_agent-renew_watch');
    });

    it('should generate correct queue name for RENEW_TOKEN', () => {
      expect(getQueueName(Events.RENEW_TOKEN)).toBe('Q_email_agent-renew_token');
    });

    it('should generate correct queue name for PROCESS_INCOMING_EMAIL', () => {
      expect(getQueueName(Events.PROCESS_INCOMING_EMAIL)).toBe(
        'Q_email_agent-process_incoming_email',
      );
    });

    it('should generate correct queue name for DELETE_GMAIL_MESSAGE', () => {
      expect(getQueueName(Events.DELETE_GMAIL_MESSAGE)).toBe(
        'Q_email_agent-delete_gmail_message',
      );
    });

    it('should generate correct queue name for UNSUBSCRIBE_EMAIL', () => {
      expect(getQueueName(Events.UNSUBSCRIBE_EMAIL)).toBe('Q_email_agent-unsubscribe_email');
    });
  });
});
