import { Test, TestingModule } from '@nestjs/testing';
import { CronPlanner } from './cron-task';
import { QueuePublisher } from '../queue/queue.publisher';
import { CacheService } from '../cache/cache.service';
import { EntityManager } from 'typeorm';
import { Events } from '../queue/queue-constants';
import {
  createMockQueuePublisher,
  createMockCacheService,
  createMockEntityManager,
} from '../test/test-utils';

describe('CronPlanner', () => {
  let cronPlanner: CronPlanner;
  let queuePublisher: jest.Mocked<QueuePublisher>;
  let cacheService: jest.Mocked<CacheService>;
  let entityManager: any;

  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };

    const mockQueryRunner = {
      query: jest.fn().mockResolvedValue([]),
      release: jest.fn(),
    };

    const mockEntityManager = {
      connection: {
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronPlanner,
        {
          provide: QueuePublisher,
          useValue: createMockQueuePublisher(),
        },
        {
          provide: CacheService,
          useValue: createMockCacheService(),
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    cronPlanner = module.get<CronPlanner>(CronPlanner);
    queuePublisher = module.get(QueuePublisher);
    cacheService = module.get(CacheService);
    entityManager = module.get(EntityManager);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('renewWatch', () => {
    it('should skip if lock is already acquired', async () => {
      cacheService.getData.mockResolvedValue('1'); // Lock exists

      const result = await cronPlanner.renewWatch();

      expect(cacheService.getData).toHaveBeenCalledWith('RENEW_WATCH_KEY');
      expect(entityManager.connection.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should skip in non-production environment', async () => {
      process.env.NODE_ENV = 'development';
      cacheService.getData.mockResolvedValue(null); // No lock

      const result = await cronPlanner.renewWatch();

      expect(result).toBe('ok');
      expect(queuePublisher.publish).not.toHaveBeenCalled();
    });

    it('should acquire lock and process credentials in production', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.getData.mockResolvedValue(null);

      const mockCredentials = [
        { inbox_email: 'user1@example.com' },
        { inbox_email: 'user2@example.com' },
      ];
      const mockQueryRunner = entityManager.connection.createQueryRunner();
      mockQueryRunner.query.mockResolvedValue(mockCredentials);

      await cronPlanner.renewWatch();

      expect(cacheService.setData).toHaveBeenCalledWith('RENEW_WATCH_KEY', '1', 1800);
      expect(queuePublisher.publish).toHaveBeenCalledTimes(2);
      expect(queuePublisher.publish).toHaveBeenCalledWith(Events.RENEW_WATCH, {
        inbox_email: 'user1@example.com',
      });
      expect(queuePublisher.publish).toHaveBeenCalledWith(Events.RENEW_WATCH, {
        inbox_email: 'user2@example.com',
      });
    });

    it('should release lock on completion', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.getData.mockResolvedValue(null);

      await cronPlanner.renewWatch();

      expect(cacheService.evictData).toHaveBeenCalledWith('RENEW_WATCH_KEY');
    });

    it('should release query runner on completion', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.getData.mockResolvedValue(null);

      const mockQueryRunner = entityManager.connection.createQueryRunner();
      await cronPlanner.renewWatch();

      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should release lock even on error', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.getData.mockResolvedValue(null);

      const mockQueryRunner = entityManager.connection.createQueryRunner();
      mockQueryRunner.query.mockRejectedValue(new Error('Database error'));

      await cronPlanner.renewWatch();

      expect(cacheService.evictData).toHaveBeenCalledWith('RENEW_WATCH_KEY');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should query for credentials with watchers older than 2 days', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.getData.mockResolvedValue(null);

      const mockQueryRunner = entityManager.connection.createQueryRunner();
      await cronPlanner.renewWatch();

      const queryCall = mockQueryRunner.query.mock.calls[0][0];
      expect(queryCall).toContain('select uc.inbox_email from user_credentials');
      expect(queryCall).toContain('inner join users u on u.id = uc.user_id');
      expect(queryCall).toContain("u.status = 'verified'");
      expect(queryCall).toContain('> watcher_date');
    });

    it('should handle empty result set', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.getData.mockResolvedValue(null);

      const mockQueryRunner = entityManager.connection.createQueryRunner();
      mockQueryRunner.query.mockResolvedValue([]);

      await cronPlanner.renewWatch();

      expect(queuePublisher.publish).not.toHaveBeenCalled();
      expect(cacheService.evictData).toHaveBeenCalledWith('RENEW_WATCH_KEY');
    });
  });

  describe('renewTokens', () => {
    it('should skip if lock is already acquired', async () => {
      cacheService.getData.mockResolvedValue('1'); // Lock exists

      const result = await cronPlanner.renewTokens();

      expect(cacheService.getData).toHaveBeenCalledWith('RENEW_TOKEN_KEY');
      expect(entityManager.connection.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should skip in non-production environment', async () => {
      process.env.NODE_ENV = 'development';
      cacheService.getData.mockResolvedValue(null);

      const result = await cronPlanner.renewTokens();

      expect(result).toBe('ok');
      expect(queuePublisher.publish).not.toHaveBeenCalled();
    });

    it('should acquire lock and process expiring tokens in production', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.getData.mockResolvedValue(null);

      const mockCredentials = [
        { inbox_email: 'expiring1@example.com' },
        { inbox_email: 'expiring2@example.com' },
      ];
      const mockQueryRunner = entityManager.connection.createQueryRunner();
      mockQueryRunner.query.mockResolvedValue(mockCredentials);

      await cronPlanner.renewTokens();

      expect(cacheService.setData).toHaveBeenCalledWith('RENEW_TOKEN_KEY', '1', 3600);
      expect(queuePublisher.publish).toHaveBeenCalledTimes(2);
      expect(queuePublisher.publish).toHaveBeenCalledWith(Events.RENEW_TOKEN, {
        inbox_email: 'expiring1@example.com',
      });
      expect(queuePublisher.publish).toHaveBeenCalledWith(Events.RENEW_TOKEN, {
        inbox_email: 'expiring2@example.com',
      });
    });

    it('should release lock on completion', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.getData.mockResolvedValue(null);

      await cronPlanner.renewTokens();

      expect(cacheService.evictData).toHaveBeenCalledWith('RENEW_TOKEN_KEY');
    });

    it('should release query runner on completion', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.getData.mockResolvedValue(null);

      const mockQueryRunner = entityManager.connection.createQueryRunner();
      await cronPlanner.renewTokens();

      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should release lock even on error', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.getData.mockResolvedValue(null);

      const mockQueryRunner = entityManager.connection.createQueryRunner();
      mockQueryRunner.query.mockRejectedValue(new Error('Database error'));

      await cronPlanner.renewTokens();

      expect(cacheService.evictData).toHaveBeenCalledWith('RENEW_TOKEN_KEY');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should query for tokens expiring in next 10 minutes', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.getData.mockResolvedValue(null);

      const mockQueryRunner = entityManager.connection.createQueryRunner();
      await cronPlanner.renewTokens();

      const queryCall = mockQueryRunner.query.mock.calls[0][0];
      expect(queryCall).toContain('select uc.inbox_email from user_credentials');
      expect(queryCall).toContain('inner join users u on u.id = uc.user_id');
      expect(queryCall).toContain("u.status = 'verified'");
      expect(queryCall).toContain('inbox_access = 1');
      expect(queryCall).toContain('expiry_date <');
      expect(queryCall).toContain('expiry_date >');
    });

    it('should handle empty result set', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.getData.mockResolvedValue(null);

      const mockQueryRunner = entityManager.connection.createQueryRunner();
      mockQueryRunner.query.mockResolvedValue([]);

      await cronPlanner.renewTokens();

      expect(queuePublisher.publish).not.toHaveBeenCalled();
      expect(cacheService.evictData).toHaveBeenCalledWith('RENEW_TOKEN_KEY');
    });
  });

  describe('Lock Mechanism', () => {
    it('should prevent concurrent execution of renewWatch', async () => {
      process.env.NODE_ENV = 'production';

      // First call acquires lock
      cacheService.getData.mockResolvedValueOnce(null);

      // Second call sees lock is held
      cacheService.getData.mockResolvedValueOnce('1');

      const mockQueryRunner = entityManager.connection.createQueryRunner();
      mockQueryRunner.query.mockResolvedValue([{ inbox_email: 'test@example.com' }]);

      // Run first call
      await cronPlanner.renewWatch();

      // Simulate second call while first is "running"
      const secondResult = await cronPlanner.renewWatch();

      // First call should publish, second should not
      expect(queuePublisher.publish).toHaveBeenCalledTimes(1);
    });

    it('should prevent concurrent execution of renewTokens', async () => {
      process.env.NODE_ENV = 'production';

      // First call acquires lock
      cacheService.getData.mockResolvedValueOnce(null);

      // Second call sees lock is held
      cacheService.getData.mockResolvedValueOnce('1');

      const mockQueryRunner = entityManager.connection.createQueryRunner();
      mockQueryRunner.query.mockResolvedValue([{ inbox_email: 'test@example.com' }]);

      // Run first call
      await cronPlanner.renewTokens();

      // Simulate second call while first is "running"
      await cronPlanner.renewTokens();

      // First call should publish, second should not
      expect(queuePublisher.publish).toHaveBeenCalledTimes(1);
    });
  });
});
