import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { createMockRedis } from '../test/test-utils';

// Create a token for Redis injection
const REDIS_TOKEN = 'default_IORedisModuleConnectionToken';

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(async () => {
    mockRedis = createMockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: REDIS_TOKEN,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getData', () => {
    it('should get data from Redis', async () => {
      const expectedValue = 'cached-value';
      mockRedis.get.mockResolvedValue(expectedValue);

      const result = await service.getData('test-key');

      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe(expectedValue);
    });

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getData('nonexistent-key');

      expect(mockRedis.get).toHaveBeenCalledWith('nonexistent-key');
      expect(result).toBeNull();
    });

    it('should handle Redis errors', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection error'));

      await expect(service.getData('test-key')).rejects.toThrow('Redis connection error');
    });
  });

  describe('setData', () => {
    it('should set data with default TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.setData('test-key', 'test-value');

      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 3600, 'test-value');
    });

    it('should set data with custom TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.setData('test-key', 'test-value', 7200);

      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 7200, 'test-value');
    });

    it('should set data with short TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.setData('lock-key', '1', 60);

      expect(mockRedis.setex).toHaveBeenCalledWith('lock-key', 60, '1');
    });

    it('should handle object values', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const objectValue = { name: 'test', count: 42 };
      await service.setData('object-key', JSON.stringify(objectValue));

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'object-key',
        3600,
        JSON.stringify(objectValue),
      );
    });

    it('should handle Redis errors on set', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis write error'));

      await expect(service.setData('test-key', 'value')).rejects.toThrow('Redis write error');
    });
  });

  describe('evictData', () => {
    it('should delete key from Redis', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.evictData('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle non-existent key deletion', async () => {
      mockRedis.del.mockResolvedValue(0);

      await service.evictData('nonexistent-key');

      expect(mockRedis.del).toHaveBeenCalledWith('nonexistent-key');
    });

    it('should handle Redis errors on delete', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis delete error'));

      await expect(service.evictData('test-key')).rejects.toThrow('Redis delete error');
    });
  });

  describe('Cache Patterns', () => {
    it('should support lock pattern (set if not exists)', async () => {
      // First check - lock not acquired
      mockRedis.get.mockResolvedValueOnce(null);

      const isLocked = await service.getData('LOCK_KEY');
      expect(isLocked).toBeNull();

      // Acquire lock
      mockRedis.setex.mockResolvedValueOnce('OK');
      await service.setData('LOCK_KEY', '1', 1800);

      expect(mockRedis.setex).toHaveBeenCalledWith('LOCK_KEY', 1800, '1');
    });

    it('should support cache-aside pattern', async () => {
      // Cache miss
      mockRedis.get.mockResolvedValueOnce(null);
      const cachedValue = await service.getData('user:123');
      expect(cachedValue).toBeNull();

      // Fetch from database (mocked)
      const userData = { id: '123', name: 'Test User' };

      // Cache the result
      mockRedis.setex.mockResolvedValueOnce('OK');
      await service.setData('user:123', JSON.stringify(userData), 600);

      expect(mockRedis.setex).toHaveBeenCalledWith('user:123', 600, JSON.stringify(userData));
    });

    it('should support cache invalidation', async () => {
      // Invalidate single key
      mockRedis.del.mockResolvedValueOnce(1);
      await service.evictData('user:123');

      expect(mockRedis.del).toHaveBeenCalledWith('user:123');
    });
  });
});
