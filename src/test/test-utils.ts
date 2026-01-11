import { User } from '../user/user.entity';
import { UserCredential } from '../user/userCredendtial.entity';
import { UserEmailCategory } from '../user/userEmailCategory.entity';
import { UserIncomingEmail } from '../user/userIncomingEmail.entity';
import { UserStatus } from '../utils/constants';

/**
 * Creates a mock User entity for testing
 */
export const createMockUser = (overrides: Partial<User> = {}): User => {
  const user = new User();
  user.id = 'test-user-id';
  user.fname = 'Test';
  user.lname = 'User';
  user.email = 'test@example.com';
  user.status = UserStatus.VALID;
  user.createdAt = new Date();
  user.credentials = [];
  user.emailCategories = [];
  return { ...user, ...overrides } as User;
};

/**
 * Creates a mock UserCredential entity for testing
 */
export const createMockCredential = (
  overrides: Partial<UserCredential> = {},
): UserCredential => {
  const credential = new UserCredential();
  credential.id = 'test-credential-id';
  credential.inboxEmail = 'inbox@example.com';
  credential.tokens = 'encrypted-tokens';
  credential.expiryDate = Date.now() + 3600000; // 1 hour from now
  credential.watcherDate = Date.now();
  credential.lastHistoryId = 'history-123';
  credential.user = createMockUser();
  return { ...credential, ...overrides } as UserCredential;
};

/**
 * Creates a mock UserEmailCategory entity for testing
 */
export const createMockEmailCategory = (
  overrides: Partial<UserEmailCategory> = {},
): UserEmailCategory => {
  const category = new UserEmailCategory();
  category.id = 'test-category-id';
  category.name = 'Test Category';
  category.description = 'A test category description';
  category.user = createMockUser();
  return { ...category, ...overrides } as UserEmailCategory;
};

/**
 * Creates a mock UserIncomingEmail entity for testing
 */
export const createMockIncomingEmail = (
  overrides: Partial<UserIncomingEmail> = {},
): UserIncomingEmail => {
  const email = new UserIncomingEmail();
  email.id = 'test-email-id';
  email.from = 'sender@example.com';
  email.subject = 'Test Subject';
  email.htmlText = '<p>Test HTML content</p>';
  email.text = 'Test text content';
  email.messageId = 'msg-123';
  email.attachments = [];
  email.summary = null;
  email.hasUnsubscribe = false;
  email.isProcessed = false;
  email.unsubscribed = false;
  email.creationDate = Date.now();
  email.createdAt = new Date();
  email.credential = createMockCredential();
  email.category = null;
  return { ...email, ...overrides } as UserIncomingEmail;
};

/**
 * Creates a mock Repository with common TypeORM methods
 */
export const createMockRepository = <T = any>() => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    whereInIds: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  })),
});

/**
 * Creates a mock ConfigService
 */
export const createMockConfigService = (config: Record<string, any> = {}) => ({
  get: jest.fn((key: string) => {
    const defaultConfig = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      GOOGLE_REDIRECT: 'http://localhost:3000/callback',
      GOOGLE_QUEUE_TOPIC: 'projects/test/topics/test-topic',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY: 'test-access-key',
      AWS_SECRET_KEY: 'test-secret-key',
      S3_BUCKET: 'test-bucket',
      GOOGLE_APPLICATION_CREDENTIALS: '/path/to/credentials.json',
      ...config,
    };
    return defaultConfig[key];
  }),
});

/**
 * Creates a mock QueuePublisher
 */
export const createMockQueuePublisher = () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  createQueue: jest.fn(),
});

/**
 * Creates a mock AmqpConnection for RabbitMQ
 */
export const createMockAmqpConnection = () => ({
  channel: {
    assertQueue: jest.fn(),
    bindQueue: jest.fn(),
  },
  publish: jest.fn(),
});

/**
 * Creates a mock Redis client
 */
export const createMockRedis = () => ({
  get: jest.fn().mockResolvedValue(null),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
});

/**
 * Creates a mock CacheService
 */
export const createMockCacheService = () => ({
  getData: jest.fn().mockResolvedValue(null),
  setData: jest.fn().mockResolvedValue(undefined),
  evictData: jest.fn().mockResolvedValue(undefined),
});

/**
 * Creates a mock JwtService
 */
export const createMockJwtService = () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ id: 'test-user-id', username: 'test@example.com' }),
});

/**
 * Creates a mock EntityManager for TypeORM
 */
export const createMockEntityManager = () => ({
  connection: {
    createQueryRunner: jest.fn().mockReturnValue({
      query: jest.fn().mockResolvedValue([]),
      release: jest.fn(),
    }),
  },
});

/**
 * Creates a mock S3Client
 */
export const createMockS3Client = () => ({
  send: jest.fn().mockResolvedValue({
    Body: {
      on: jest.fn((event, callback) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return { on: jest.fn() };
      }),
    },
  }),
});

/**
 * Creates a mock HTTP response object for controller tests
 */
export const createMockResponse = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

/**
 * Creates a mock HTTP request object with authenticated user
 */
export const createMockRequest = (user = { id: 'test-user-id', username: 'test@example.com' }) => ({
  user,
});

/**
 * Creates mock Logger that captures log messages
 */
export const createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
});
