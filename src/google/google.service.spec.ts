import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GoogleSerivce } from './google.service';
import { UserService } from '../user/user.service';
import { QueuePublisher } from '../queue/queue.publisher';
import { UserStatus } from '../utils/constants';
import {
  createMockUser,
  createMockCredential,
  createMockConfigService,
  createMockJwtService,
  createMockQueuePublisher,
} from '../test/test-utils';

// Mock google-auth-library
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth'),
    getToken: jest.fn().mockResolvedValue({
      tokens: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expiry_date: Date.now() + 3600000,
      },
    }),
    setCredentials: jest.fn(),
    refreshAccessToken: jest.fn().mockResolvedValue({
      credentials: {
        access_token: 'refreshed-access-token',
        expiry_date: Date.now() + 3600000,
      },
    }),
  })),
  auth: {},
}));

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth'),
        getToken: jest.fn().mockResolvedValue({
          tokens: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expiry_date: Date.now() + 3600000,
          },
        }),
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: {
            access_token: 'refreshed-access-token',
            expiry_date: Date.now() + 3600000,
          },
        }),
      })),
    },
    gmail: jest.fn().mockReturnValue({
      users: {
        messages: {
          list: jest.fn().mockResolvedValue({
            data: { messages: [{ id: 'msg-1' }, { id: 'msg-2' }] },
          }),
          get: jest.fn().mockResolvedValue({
            data: {
              id: 'msg-1',
              payload: {
                headers: [
                  { name: 'Subject', value: 'Test Subject' },
                  { name: 'From', value: 'sender@example.com' },
                  { name: 'Date', value: new Date().toISOString() },
                ],
                mimeType: 'text/html',
                body: {
                  data: Buffer.from('<p>Test content</p>').toString('base64'),
                },
              },
            },
          }),
          modify: jest.fn().mockResolvedValue({}),
          trash: jest.fn().mockResolvedValue({}),
        },
        history: {
          list: jest.fn().mockResolvedValue({
            data: {
              history: [
                {
                  messagesAdded: [{ message: { id: 'msg-new' } }],
                },
              ],
            },
          }),
        },
        watch: jest.fn().mockResolvedValue({}),
        stop: jest.fn().mockResolvedValue({}),
      },
    }),
    oauth2: jest.fn().mockReturnValue({
      userinfo: {
        get: jest.fn().mockResolvedValue({
          data: {
            email: 'user@example.com',
            given_name: 'Test',
            family_name: 'User',
          },
        }),
      },
    }),
  },
}));

// Mock crypto helper functions
jest.mock('../utils/helper-util', () => ({
  ...jest.requireActual('../utils/helper-util'),
  encrypt: jest.fn().mockResolvedValue('encrypted-data'),
  decrypt: jest.fn().mockResolvedValue(
    JSON.stringify({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    }),
  ),
  aboutToExpire: jest.fn().mockReturnValue(false),
  getHeader: jest.fn((headers, name) => {
    const header = headers.find((h) => h.name === name);
    return header ? header.value : '';
  }),
}));

describe('GoogleService', () => {
  let service: GoogleSerivce;
  let userService: jest.Mocked<UserService>;
  let queuePublisher: jest.Mocked<QueuePublisher>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUserService = {
    findByEmail: jest.fn(),
    findCredentialByInboxEmail: jest.fn(),
    findCredentialById: jest.fn(),
    createUserFromGoogle: jest.fn(),
    saveCredential: jest.fn(),
    saveIncomingEmail: jest.fn(),
    findIncomingEmailByMessageId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleSerivce,
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: QueuePublisher,
          useValue: createMockQueuePublisher(),
        },
        {
          provide: JwtService,
          useValue: createMockJwtService(),
        },
      ],
    }).compile();

    service = module.get<GoogleSerivce>(GoogleSerivce);
    userService = module.get(UserService);
    queuePublisher = module.get(QueuePublisher);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGoogleAuth', () => {
    it('should generate Google OAuth URL', async () => {
      const result = await service.getGoogleAuth();

      expect(result).toHaveProperty('url');
      expect(result.url).toContain('https://accounts.google.com');
    });

    it('should encode user email in state if provided', async () => {
      const result = await service.getGoogleAuth('user@example.com');

      expect(result).toHaveProperty('url');
    });
  });

  describe('extractHtml', () => {
    it('should extract HTML from simple email payload', () => {
      const payload = {
        mimeType: 'text/html',
        body: {
          data: Buffer.from('<p>Test HTML</p>').toString('base64'),
        },
      };

      const result = service.extractHtml(payload);

      expect(result).toBe('<p>Test HTML</p>');
    });

    it('should extract HTML from multipart email', () => {
      const payload = {
        mimeType: 'multipart/alternative',
        parts: [
          {
            mimeType: 'text/plain',
            body: { data: Buffer.from('Plain text').toString('base64') },
          },
          {
            mimeType: 'text/html',
            body: { data: Buffer.from('<p>HTML content</p>').toString('base64') },
          },
        ],
      };

      const result = service.extractHtml(payload);

      expect(result).toBe('<p>HTML content</p>');
    });

    it('should return empty string for null payload', () => {
      const result = service.extractHtml(null);

      expect(result).toBe('');
    });

    it('should handle nested multipart structures', () => {
      const payload = {
        mimeType: 'multipart/mixed',
        parts: [
          {
            mimeType: 'multipart/alternative',
            parts: [
              {
                mimeType: 'text/html',
                body: { data: Buffer.from('<p>Nested HTML</p>').toString('base64') },
              },
            ],
          },
        ],
      };

      const result = service.extractHtml(payload);

      expect(result).toBe('<p>Nested HTML</p>');
    });
  });

  describe('extractText', () => {
    it('should extract plain text from simple email payload', () => {
      const payload = {
        mimeType: 'text/plain',
        body: {
          data: Buffer.from('Plain text content').toString('base64'),
        },
      };

      const result = service.extractText(payload);

      expect(result).toBe('Plain text content');
    });

    it('should extract plain text from multipart email', () => {
      const payload = {
        mimeType: 'multipart/alternative',
        parts: [
          {
            mimeType: 'text/plain',
            body: { data: Buffer.from('Plain text').toString('base64') },
          },
          {
            mimeType: 'text/html',
            body: { data: Buffer.from('<p>HTML</p>').toString('base64') },
          },
        ],
      };

      const result = service.extractText(payload);

      expect(result).toBe('Plain text');
    });

    it('should return empty string for null payload', () => {
      const result = service.extractText(null);

      expect(result).toBe('');
    });
  });

  describe('extractAnyContent', () => {
    it('should extract content from body data', () => {
      const payload = {
        body: {
          data: Buffer.from('Some content').toString('base64'),
        },
      };

      const result = service.extractAnyContent(payload);

      expect(result).toBe('Some content');
    });

    it('should return empty string for null payload', () => {
      const result = service.extractAnyContent(null);

      expect(result).toBe('');
    });

    it('should skip attachments', () => {
      const payload = {
        parts: [
          {
            filename: 'attachment.pdf',
            body: { data: Buffer.from('attachment data').toString('base64') },
          },
          {
            filename: '',
            body: { data: Buffer.from('actual content').toString('base64') },
          },
        ],
      };

      const result = service.extractAnyContent(payload);

      expect(result).toBe('actual content');
    });
  });

  describe('renewTokenForCredential', () => {
    it('should renew token for a credential', async () => {
      const mockCredential = createMockCredential();
      mockUserService.saveCredential.mockResolvedValue(mockCredential);

      const result = await service.renewTokenForCredential(mockCredential);

      expect(result).toBeDefined();
      expect(mockUserService.saveCredential).toHaveBeenCalled();
    });

    it('should return null on refresh failure', async () => {
      const { OAuth2Client } = require('google-auth-library');
      OAuth2Client.mockImplementationOnce(() => ({
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockRejectedValue(new Error('Refresh failed')),
      }));

      const mockCredential = createMockCredential();

      const result = await service.renewTokenForCredential(mockCredential);

      expect(result).toBeNull();
    });
  });

  describe('renewTokenByInboxEmail', () => {
    it('should renew token by inbox email', async () => {
      const mockCredential = createMockCredential();
      mockUserService.findCredentialByInboxEmail.mockResolvedValue(mockCredential);
      mockUserService.saveCredential.mockResolvedValue(mockCredential);

      const result = await service.renewTokenByInboxEmail('inbox@example.com');

      expect(mockUserService.findCredentialByInboxEmail).toHaveBeenCalledWith('inbox@example.com', [
        'user',
      ]);
    });

    it('should return undefined if credential not found', async () => {
      mockUserService.findCredentialByInboxEmail.mockResolvedValue(null);

      const result = await service.renewTokenByInboxEmail('nonexistent@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('getAccessTokenForCredential', () => {
    it('should return access token for valid credential', async () => {
      const mockCredential = createMockCredential();

      const result = await service.getAccessTokenForCredential(mockCredential);

      expect(result).toBe('mock-access-token');
    });

    it('should renew token if about to expire', async () => {
      const { aboutToExpire } = require('../utils/helper-util');
      aboutToExpire.mockReturnValueOnce(true);

      const mockCredential = createMockCredential();
      mockUserService.saveCredential.mockResolvedValue(mockCredential);

      const result = await service.getAccessTokenForCredential(mockCredential);

      expect(result).toBeDefined();
    });

    it('should return null on error', async () => {
      const { decrypt } = require('../utils/helper-util');
      decrypt.mockRejectedValueOnce(new Error('Decryption failed'));

      const mockCredential = createMockCredential();

      const result = await service.getAccessTokenForCredential(mockCredential);

      expect(result).toBeNull();
    });
  });

  describe('trashMessage', () => {
    it('should trash a Gmail message successfully', async () => {
      const result = await service.trashMessage('mock-token', 'msg-123');

      expect(result).toBe(true);
    });

    it('should return false on failure', async () => {
      const { google } = require('googleapis');
      google.gmail.mockReturnValueOnce({
        users: {
          messages: {
            trash: jest.fn().mockRejectedValue(new Error('Failed')),
          },
        },
      });

      const result = await service.trashMessage('mock-token', 'msg-123');

      expect(result).toBe(false);
    });
  });

  describe('messageHandler', () => {
    it('should process incoming Gmail message', async () => {
      const mockCredential = createMockCredential({
        user: createMockUser({ status: UserStatus.VALID }),
        lastHistoryId: 'prev-history',
      });
      mockUserService.findCredentialByInboxEmail.mockResolvedValue(mockCredential);
      mockUserService.findIncomingEmailByMessageId.mockResolvedValue(null);
      mockUserService.saveIncomingEmail.mockResolvedValue({ id: 'saved-email-id' });
      mockUserService.saveCredential.mockResolvedValue(mockCredential);

      const message = {
        data: Buffer.from(
          JSON.stringify({
            emailAddress: 'inbox@example.com',
            historyId: 'new-history',
          }),
        ),
        ack: jest.fn(),
      };

      await service.messageHandler(message);

      expect(message.ack).toHaveBeenCalled();
      expect(mockUserService.findCredentialByInboxEmail).toHaveBeenCalledWith('inbox@example.com', [
        'user',
      ]);
    });

    it('should ack message if no credential found', async () => {
      mockUserService.findCredentialByInboxEmail.mockResolvedValue(null);

      const message = {
        data: Buffer.from(
          JSON.stringify({
            emailAddress: 'unknown@example.com',
            historyId: 'history-123',
          }),
        ),
        ack: jest.fn(),
      };

      await service.messageHandler(message);

      expect(message.ack).toHaveBeenCalled();
    });

    it('should stop watch for expired user', async () => {
      const mockCredential = createMockCredential({
        user: createMockUser({ status: UserStatus.EXPIRED }),
      });
      mockUserService.findCredentialByInboxEmail.mockResolvedValue(mockCredential);

      const message = {
        data: Buffer.from(
          JSON.stringify({
            emailAddress: 'inbox@example.com',
            historyId: 'history-123',
          }),
        ),
        ack: jest.fn(),
      };

      await service.messageHandler(message);

      expect(message.ack).toHaveBeenCalled();
    });

    it('should skip already existing messages', async () => {
      const mockCredential = createMockCredential({
        user: createMockUser({ status: UserStatus.VALID }),
        lastHistoryId: null, // First sync
      });
      mockUserService.findCredentialByInboxEmail.mockResolvedValue(mockCredential);
      mockUserService.findIncomingEmailByMessageId.mockResolvedValue({ id: 'existing-email' });
      mockUserService.saveCredential.mockResolvedValue(mockCredential);

      const message = {
        data: Buffer.from(
          JSON.stringify({
            emailAddress: 'inbox@example.com',
            historyId: 'new-history',
          }),
        ),
        ack: jest.fn(),
      };

      await service.messageHandler(message);

      expect(mockUserService.saveIncomingEmail).not.toHaveBeenCalled();
      expect(message.ack).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockUserService.findCredentialByInboxEmail.mockRejectedValue(new Error('Database error'));

      const message = {
        data: Buffer.from(
          JSON.stringify({
            emailAddress: 'inbox@example.com',
            historyId: 'history-123',
          }),
        ),
        ack: jest.fn(),
      };

      await service.messageHandler(message);

      expect(message.ack).toHaveBeenCalled();
    });
  });

  describe('verifyCode', () => {
    it('should verify OAuth code and return JWT token', async () => {
      const mockUser = createMockUser({ credentials: [] });
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockUserService.saveCredential.mockResolvedValue(createMockCredential());

      const result = await service.verifyCode('auth-code');

      expect(result).toHaveProperty('token');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should create new user if not exists', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      const newUser = createMockUser();
      mockUserService.createUserFromGoogle.mockResolvedValue(newUser);
      mockUserService.saveCredential.mockResolvedValue(createMockCredential());

      const result = await service.verifyCode('auth-code');

      expect(mockUserService.createUserFromGoogle).toHaveBeenCalled();
      expect(result).toHaveProperty('token');
    });

    it('should decode user email from state parameter', async () => {
      const stateData = { nonce: '12345', userEmail: 'existing@example.com' };
      const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

      const mockUser = createMockUser({ email: 'existing@example.com' });
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockUserService.saveCredential.mockResolvedValue(createMockCredential());

      const result = await service.verifyCode('auth-code', state);

      expect(mockUserService.findByEmail).toHaveBeenCalledWith('existing@example.com', {}, [
        'credentials',
      ]);
      expect(result).toHaveProperty('token');
    });

    it('should return null token on OAuth error', async () => {
      const { google } = require('googleapis');
      const mockOAuth2Client = service['oauth2Client'];
      mockOAuth2Client.getToken = jest.fn().mockRejectedValue(new Error('OAuth error'));

      const result = await service.verifyCode('invalid-code');

      expect(result).toEqual({ token: null });
    });
  });

  describe('renewWatch', () => {
    it('should renew Gmail watch for a credential', async () => {
      const mockCredential = createMockCredential();
      mockUserService.findCredentialByInboxEmail.mockResolvedValue(mockCredential);
      mockUserService.saveCredential.mockResolvedValue(mockCredential);

      await service.renewWatch('inbox@example.com');

      expect(mockUserService.findCredentialByInboxEmail).toHaveBeenCalledWith('inbox@example.com', [
        'user',
      ]);
      expect(mockUserService.saveCredential).toHaveBeenCalled();
    });

    it('should return if credential not found', async () => {
      mockUserService.findCredentialByInboxEmail.mockResolvedValue(null);

      await service.renewWatch('nonexistent@example.com');

      expect(mockUserService.saveCredential).not.toHaveBeenCalled();
    });

    it('should renew token if about to expire', async () => {
      const { aboutToExpire } = require('../utils/helper-util');
      aboutToExpire.mockReturnValueOnce(true);

      const mockCredential = createMockCredential();
      mockUserService.findCredentialByInboxEmail.mockResolvedValue(mockCredential);
      mockUserService.saveCredential.mockResolvedValue(mockCredential);

      await service.renewWatch('inbox@example.com');

      expect(mockUserService.saveCredential).toHaveBeenCalled();
    });
  });

  describe('stopWatchForCredential', () => {
    it('should stop Gmail watch for a credential', async () => {
      const mockCredential = createMockCredential();

      const result = await service.stopWatchForCredential(mockCredential);

      expect(result).toBeDefined();
    });

    it('should handle stop watch failure gracefully', async () => {
      const { google } = require('googleapis');
      google.gmail.mockReturnValueOnce({
        users: {
          stop: jest.fn().mockRejectedValue(new Error('Stop failed')),
        },
      });

      const mockCredential = createMockCredential();

      const result = await service.stopWatchForCredential(mockCredential);

      expect(result).toBeUndefined();
    });
  });
});
