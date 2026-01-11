import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleQueueHandler } from './google-queue.handler';
import { GoogleSerivce } from './google.service';
import { createMockConfigService } from '../test/test-utils';

// Mock @google-cloud/pubsub
jest.mock('@google-cloud/pubsub', () => ({
  PubSub: jest.fn().mockImplementation(() => ({
    subscription: jest.fn().mockReturnValue({
      on: jest.fn(),
    }),
  })),
}));

describe('GoogleQueueHandler', () => {
  let handler: GoogleQueueHandler;
  let googleService: jest.Mocked<GoogleSerivce>;
  let configService: jest.Mocked<ConfigService>;

  const mockGoogleService = {
    messageHandler: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleQueueHandler,
        {
          provide: GoogleSerivce,
          useValue: mockGoogleService,
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
      ],
    }).compile();

    handler = module.get<GoogleQueueHandler>(GoogleQueueHandler);
    googleService = module.get(GoogleSerivce);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribe', () => {
    it('should skip subscription if subscriptionNameOrId is not provided', () => {
      const { PubSub } = require('@google-cloud/pubsub');

      handler.subscribe('');

      expect(PubSub).not.toHaveBeenCalled();
    });

    it('should skip subscription if subscriptionNameOrId is null', () => {
      const { PubSub } = require('@google-cloud/pubsub');

      handler.subscribe(null as any);

      expect(PubSub).not.toHaveBeenCalled();
    });

    it('should create PubSub subscription with credentials path', () => {
      const { PubSub } = require('@google-cloud/pubsub');
      const mockSubscription = {
        on: jest.fn(),
      };
      PubSub.mockImplementation(() => ({
        subscription: jest.fn().mockReturnValue(mockSubscription),
      }));

      handler.subscribe('projects/test/subscriptions/test-sub');

      expect(PubSub).toHaveBeenCalled();
      expect(mockSubscription.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockSubscription.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle PubSub initialization errors gracefully', () => {
      const { PubSub } = require('@google-cloud/pubsub');
      PubSub.mockImplementation(() => {
        throw new Error('PubSub initialization failed');
      });

      expect(() => handler.subscribe('projects/test/subscriptions/test-sub')).not.toThrow();
    });

    it('should bind message handler to googleService', () => {
      const { PubSub } = require('@google-cloud/pubsub');
      const mockOn = jest.fn();
      PubSub.mockImplementation(() => ({
        subscription: jest.fn().mockReturnValue({
          on: mockOn,
        }),
      }));

      handler.subscribe('projects/test/subscriptions/test-sub');

      // Verify message handler is registered
      const messageCall = mockOn.mock.calls.find((call) => call[0] === 'message');
      expect(messageCall).toBeDefined();
    });

    it('should register error handler', () => {
      const { PubSub } = require('@google-cloud/pubsub');
      const mockOn = jest.fn();
      PubSub.mockImplementation(() => ({
        subscription: jest.fn().mockReturnValue({
          on: mockOn,
        }),
      }));

      handler.subscribe('projects/test/subscriptions/test-sub');

      // Verify error handler is registered
      const errorCall = mockOn.mock.calls.find((call) => call[0] === 'error');
      expect(errorCall).toBeDefined();
    });

    it('should handle absolute credential paths', () => {
      const { PubSub } = require('@google-cloud/pubsub');
      const mockSubscription = {
        on: jest.fn(),
      };
      PubSub.mockImplementation(() => ({
        subscription: jest.fn().mockReturnValue(mockSubscription),
      }));

      // Mock config to return absolute path
      const mockConfig = createMockConfigService({
        GOOGLE_APPLICATION_CREDENTIALS: '/absolute/path/to/credentials.json',
      });
      (handler as any).configService = mockConfig;

      handler.subscribe('projects/test/subscriptions/test-sub');

      expect(PubSub).toHaveBeenCalled();
    });
  });
});
