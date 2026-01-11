import { Test, TestingModule } from '@nestjs/testing';
import { GoogleRabbitHandler } from './google-rabbit.handler';
import { GoogleSerivce } from './google.service';
import { UserService } from '../user/user.service';
import { createMockCredential } from '../test/test-utils';

describe('GoogleRabbitHandler', () => {
  let handler: GoogleRabbitHandler;
  let googleService: jest.Mocked<GoogleSerivce>;
  let userService: jest.Mocked<UserService>;

  const mockGoogleService = {
    renewWatch: jest.fn(),
    renewTokenByInboxEmail: jest.fn(),
    getAccessTokenForCredential: jest.fn(),
    trashMessage: jest.fn(),
  };

  const mockUserService = {
    findCredentialById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleRabbitHandler,
        {
          provide: GoogleSerivce,
          useValue: mockGoogleService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    handler = module.get<GoogleRabbitHandler>(GoogleRabbitHandler);
    googleService = module.get(GoogleSerivce);
    userService = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleRenewWatch', () => {
    it('should renew watch for user inbox', async () => {
      mockGoogleService.renewWatch.mockResolvedValue(undefined);

      await handler.handleRenewWatch({ inbox_email: 'user@example.com' });

      expect(mockGoogleService.renewWatch).toHaveBeenCalledWith('user@example.com');
    });

    it('should handle errors gracefully', async () => {
      mockGoogleService.renewWatch.mockRejectedValue(new Error('Renew watch failed'));

      await expect(
        handler.handleRenewWatch({ inbox_email: 'user@example.com' }),
      ).resolves.not.toThrow();

      expect(mockGoogleService.renewWatch).toHaveBeenCalledWith('user@example.com');
    });
  });

  describe('handleRenewToken', () => {
    it('should renew token for user inbox', async () => {
      mockGoogleService.renewTokenByInboxEmail.mockResolvedValue(createMockCredential());

      await handler.handleRenewToken({ inbox_email: 'user@example.com' });

      expect(mockGoogleService.renewTokenByInboxEmail).toHaveBeenCalledWith('user@example.com');
    });

    it('should handle errors gracefully', async () => {
      mockGoogleService.renewTokenByInboxEmail.mockRejectedValue(new Error('Token renewal failed'));

      await expect(
        handler.handleRenewToken({ inbox_email: 'user@example.com' }),
      ).resolves.not.toThrow();

      expect(mockGoogleService.renewTokenByInboxEmail).toHaveBeenCalledWith('user@example.com');
    });
  });

  describe('handleDeleteGmailMessage', () => {
    it('should delete Gmail message successfully', async () => {
      const mockCredential = createMockCredential();
      mockUserService.findCredentialById.mockResolvedValue(mockCredential);
      mockGoogleService.getAccessTokenForCredential.mockResolvedValue('access-token');
      mockGoogleService.trashMessage.mockResolvedValue(true);

      await handler.handleDeleteGmailMessage({
        messageId: 'msg-123',
        credentialId: 'cred-id',
      });

      expect(mockUserService.findCredentialById).toHaveBeenCalledWith('cred-id');
      expect(mockGoogleService.getAccessTokenForCredential).toHaveBeenCalledWith(mockCredential);
      expect(mockGoogleService.trashMessage).toHaveBeenCalledWith('access-token', 'msg-123');
    });

    it('should skip deletion if credential not found', async () => {
      mockUserService.findCredentialById.mockResolvedValue(null);

      await handler.handleDeleteGmailMessage({
        messageId: 'msg-123',
        credentialId: 'nonexistent-cred',
      });

      expect(mockUserService.findCredentialById).toHaveBeenCalledWith('nonexistent-cred');
      expect(mockGoogleService.getAccessTokenForCredential).not.toHaveBeenCalled();
      expect(mockGoogleService.trashMessage).not.toHaveBeenCalled();
    });

    it('should skip deletion if access token retrieval fails', async () => {
      const mockCredential = createMockCredential();
      mockUserService.findCredentialById.mockResolvedValue(mockCredential);
      mockGoogleService.getAccessTokenForCredential.mockResolvedValue(null);

      await handler.handleDeleteGmailMessage({
        messageId: 'msg-123',
        credentialId: 'cred-id',
      });

      expect(mockGoogleService.getAccessTokenForCredential).toHaveBeenCalledWith(mockCredential);
      expect(mockGoogleService.trashMessage).not.toHaveBeenCalled();
    });

    it('should handle trash message failure', async () => {
      const mockCredential = createMockCredential();
      mockUserService.findCredentialById.mockResolvedValue(mockCredential);
      mockGoogleService.getAccessTokenForCredential.mockResolvedValue('access-token');
      mockGoogleService.trashMessage.mockResolvedValue(false);

      await handler.handleDeleteGmailMessage({
        messageId: 'msg-123',
        credentialId: 'cred-id',
      });

      expect(mockGoogleService.trashMessage).toHaveBeenCalledWith('access-token', 'msg-123');
    });

    it('should handle errors gracefully', async () => {
      mockUserService.findCredentialById.mockRejectedValue(new Error('Database error'));

      await expect(
        handler.handleDeleteGmailMessage({
          messageId: 'msg-123',
          credentialId: 'cred-id',
        }),
      ).resolves.not.toThrow();
    });
  });
});
