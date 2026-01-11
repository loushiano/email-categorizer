import { Test, TestingModule } from '@nestjs/testing';
import { GoogleController } from './google.controller';
import { GoogleSerivce } from './google.service';
import { createMockResponse, createMockRequest } from '../test/test-utils';

describe('GoogleController', () => {
  let controller: GoogleController;
  let googleService: jest.Mocked<GoogleSerivce>;

  const mockGoogleService = {
    getGoogleAuth: jest.fn(),
    verifyCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleController],
      providers: [
        {
          provide: GoogleSerivce,
          useValue: mockGoogleService,
        },
      ],
    }).compile();

    controller = module.get<GoogleController>(GoogleController);
    googleService = module.get(GoogleSerivce);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUrl', () => {
    it('should return Google OAuth URL without email', async () => {
      const mockAuthUrl = { url: 'https://accounts.google.com/o/oauth2/auth?...' };
      mockGoogleService.getGoogleAuth.mockResolvedValue(mockAuthUrl);

      const res = createMockResponse();

      await controller.getUrl(res);

      expect(mockGoogleService.getGoogleAuth).toHaveBeenCalledWith(undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockAuthUrl);
    });

    it('should return Google OAuth URL with email parameter', async () => {
      const mockAuthUrl = { url: 'https://accounts.google.com/o/oauth2/auth?...' };
      mockGoogleService.getGoogleAuth.mockResolvedValue(mockAuthUrl);

      const res = createMockResponse();

      await controller.getUrl(res, 'user@example.com');

      expect(mockGoogleService.getGoogleAuth).toHaveBeenCalledWith('user@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockAuthUrl);
    });

    it('should handle errors and return 400', async () => {
      const error = new Error('Failed to generate auth URL');
      mockGoogleService.getGoogleAuth.mockRejectedValue(error);

      const res = createMockResponse();

      await controller.getUrl(res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        JSON.stringify({ message: 'Failed to generate auth URL' }),
      );
    });
  });

  describe('getUrlForAddInbox', () => {
    it('should return OAuth URL for adding inbox to authenticated user', async () => {
      const mockAuthUrl = { url: 'https://accounts.google.com/o/oauth2/auth?...' };
      mockGoogleService.getGoogleAuth.mockResolvedValue(mockAuthUrl);

      const res = createMockResponse();
      const req = createMockRequest({ id: 'user-id', username: 'existing@example.com' });

      await controller.getUrlForAddInbox(res, req);

      expect(mockGoogleService.getGoogleAuth).toHaveBeenCalledWith('existing@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockAuthUrl);
    });
  });

  describe('verifyCode', () => {
    it('should verify code and return HTML with token', async () => {
      const mockResult = { token: 'jwt-token-here' };
      mockGoogleService.verifyCode.mockResolvedValue(mockResult);

      const res = {
        send: jest.fn(),
      };

      await controller.verifyCode(res, 'auth-code');

      expect(mockGoogleService.verifyCode).toHaveBeenCalledWith('auth-code', undefined);
      expect(res.send).toHaveBeenCalled();
      const responseHtml = res.send.mock.calls[0][0];
      expect(responseHtml).toContain('jwt-token-here');
      expect(responseHtml).toContain('GOOGLE_AUTH_SUCCESS');
      expect(responseHtml).toContain('window.opener.postMessage');
    });

    it('should verify code with state parameter', async () => {
      const mockResult = { token: 'jwt-token-here' };
      mockGoogleService.verifyCode.mockResolvedValue(mockResult);

      const res = {
        send: jest.fn(),
      };
      const state = Buffer.from(JSON.stringify({ nonce: '123', userEmail: 'user@example.com' })).toString('base64');

      await controller.verifyCode(res, 'auth-code', state);

      expect(mockGoogleService.verifyCode).toHaveBeenCalledWith('auth-code', state);
    });

    it('should handle null token gracefully', async () => {
      const mockResult = { token: null };
      mockGoogleService.verifyCode.mockResolvedValue(mockResult);

      const res = {
        send: jest.fn(),
      };

      await controller.verifyCode(res, 'invalid-code');

      const responseHtml = res.send.mock.calls[0][0];
      expect(responseHtml).toContain("token: ''");
    });

    it('should return empty token string when token is undefined', async () => {
      const mockResult = { token: undefined };
      mockGoogleService.verifyCode.mockResolvedValue(mockResult);

      const res = {
        send: jest.fn(),
      };

      await controller.verifyCode(res, 'auth-code');

      const responseHtml = res.send.mock.calls[0][0];
      expect(responseHtml).toContain("token: ''");
    });
  });
});
