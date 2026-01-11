import { Test, TestingModule } from '@nestjs/testing';
import { LlmRabbitHandler } from './llm-rabbit.handler';
import { ClaudeService } from './claude.service';
import { UserService } from '../user/user.service';
import {
  createMockIncomingEmail,
  createMockEmailCategory,
  createMockCredential,
  createMockUser,
} from '../test/test-utils';

describe('LlmRabbitHandler', () => {
  let handler: LlmRabbitHandler;
  let claudeService: jest.Mocked<ClaudeService>;
  let userService: jest.Mocked<UserService>;

  const mockClaudeService = {
    analyzeEmail: jest.fn(),
    executeUnsubscribe: jest.fn(),
  };

  const mockUserService = {
    findIncomingEmailById: jest.fn(),
    findAllEmailCategoriesByUserId: jest.fn(),
    updateIncomingEmailAnalysis: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmRabbitHandler,
        {
          provide: ClaudeService,
          useValue: mockClaudeService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    handler = module.get<LlmRabbitHandler>(LlmRabbitHandler);
    claudeService = module.get(ClaudeService);
    userService = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleProcessIncomingEmail', () => {
    it('should process incoming email and update analysis', async () => {
      const mockUser = createMockUser();
      const mockCredential = createMockCredential({ user: mockUser });
      const mockEmail = createMockIncomingEmail({
        credential: mockCredential,
        isProcessed: false,
      });
      const mockCategories = [
        createMockEmailCategory({ name: 'Newsletter', description: 'Newsletters' }),
        createMockEmailCategory({ id: 'cat-2', name: 'Receipts', description: 'Receipts' }),
      ];

      mockUserService.findIncomingEmailById.mockResolvedValue(mockEmail);
      mockUserService.findAllEmailCategoriesByUserId.mockResolvedValue(mockCategories);
      mockClaudeService.analyzeEmail.mockResolvedValue({
        categoryName: 'Newsletter',
        summary: 'Weekly newsletter summary',
        hasUnsubscribe: true,
      });
      mockUserService.updateIncomingEmailAnalysis.mockResolvedValue(mockEmail);

      await handler.handleProcessIncomingEmail({ incomingEmailId: 'email-123' });

      expect(mockUserService.findIncomingEmailById).toHaveBeenCalledWith('email-123', [
        'credential',
        'credential.user',
      ]);
      expect(mockUserService.findAllEmailCategoriesByUserId).toHaveBeenCalledWith(mockUser.id);
      expect(mockClaudeService.analyzeEmail).toHaveBeenCalledWith(
        mockEmail.htmlText,
        mockEmail.text,
        mockEmail.subject,
        [
          { name: 'Newsletter', description: 'Newsletters' },
          { name: 'Receipts', description: 'Receipts' },
        ],
      );
      expect(mockUserService.updateIncomingEmailAnalysis).toHaveBeenCalledWith('email-123', {
        summary: 'Weekly newsletter summary',
        hasUnsubscribe: true,
        category: mockCategories[0], // Newsletter category
        isProcessed: true,
      });
    });

    it('should skip processing if email not found', async () => {
      mockUserService.findIncomingEmailById.mockResolvedValue(null);

      await handler.handleProcessIncomingEmail({ incomingEmailId: 'nonexistent-id' });

      expect(mockUserService.findAllEmailCategoriesByUserId).not.toHaveBeenCalled();
      expect(mockClaudeService.analyzeEmail).not.toHaveBeenCalled();
    });

    it('should skip processing if email already processed', async () => {
      const mockEmail = createMockIncomingEmail({ isProcessed: true });
      mockUserService.findIncomingEmailById.mockResolvedValue(mockEmail);

      await handler.handleProcessIncomingEmail({ incomingEmailId: 'email-123' });

      expect(mockUserService.findAllEmailCategoriesByUserId).not.toHaveBeenCalled();
      expect(mockClaudeService.analyzeEmail).not.toHaveBeenCalled();
    });

    it('should handle null category from analysis', async () => {
      const mockUser = createMockUser();
      const mockCredential = createMockCredential({ user: mockUser });
      const mockEmail = createMockIncomingEmail({
        credential: mockCredential,
        isProcessed: false,
      });
      const mockCategories = [createMockEmailCategory()];

      mockUserService.findIncomingEmailById.mockResolvedValue(mockEmail);
      mockUserService.findAllEmailCategoriesByUserId.mockResolvedValue(mockCategories);
      mockClaudeService.analyzeEmail.mockResolvedValue({
        categoryName: null, // No category matched
        summary: 'Uncategorized email',
        hasUnsubscribe: false,
      });
      mockUserService.updateIncomingEmailAnalysis.mockResolvedValue(mockEmail);

      await handler.handleProcessIncomingEmail({ incomingEmailId: 'email-123' });

      expect(mockUserService.updateIncomingEmailAnalysis).toHaveBeenCalledWith('email-123', {
        summary: 'Uncategorized email',
        hasUnsubscribe: false,
        category: null,
        isProcessed: true,
      });
    });

    it('should match category case-insensitively', async () => {
      const mockUser = createMockUser();
      const mockCredential = createMockCredential({ user: mockUser });
      const mockEmail = createMockIncomingEmail({
        credential: mockCredential,
        isProcessed: false,
      });
      const mockCategories = [
        createMockEmailCategory({ name: 'Newsletter', description: 'Newsletters' }),
      ];

      mockUserService.findIncomingEmailById.mockResolvedValue(mockEmail);
      mockUserService.findAllEmailCategoriesByUserId.mockResolvedValue(mockCategories);
      mockClaudeService.analyzeEmail.mockResolvedValue({
        categoryName: 'NEWSLETTER', // Uppercase
        summary: 'Summary',
        hasUnsubscribe: false,
      });
      mockUserService.updateIncomingEmailAnalysis.mockResolvedValue(mockEmail);

      await handler.handleProcessIncomingEmail({ incomingEmailId: 'email-123' });

      expect(mockUserService.updateIncomingEmailAnalysis).toHaveBeenCalledWith(
        'email-123',
        expect.objectContaining({
          category: mockCategories[0],
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      mockUserService.findIncomingEmailById.mockRejectedValue(new Error('Database error'));

      await expect(
        handler.handleProcessIncomingEmail({ incomingEmailId: 'email-123' }),
      ).resolves.not.toThrow();

      expect(mockClaudeService.analyzeEmail).not.toHaveBeenCalled();
    });

    it('should handle Claude API errors gracefully', async () => {
      const mockUser = createMockUser();
      const mockCredential = createMockCredential({ user: mockUser });
      const mockEmail = createMockIncomingEmail({
        credential: mockCredential,
        isProcessed: false,
      });

      mockUserService.findIncomingEmailById.mockResolvedValue(mockEmail);
      mockUserService.findAllEmailCategoriesByUserId.mockResolvedValue([]);
      mockClaudeService.analyzeEmail.mockRejectedValue(new Error('API Error'));

      await expect(
        handler.handleProcessIncomingEmail({ incomingEmailId: 'email-123' }),
      ).resolves.not.toThrow();

      expect(mockUserService.updateIncomingEmailAnalysis).not.toHaveBeenCalled();
    });
  });

  describe('handleUnsubscribeEmail', () => {
    it('should execute unsubscribe for eligible email', async () => {
      const mockEmail = createMockIncomingEmail({
        hasUnsubscribe: true,
        htmlText: '<p>Click <a href="unsubscribe">here</a> to unsubscribe</p>',
      });

      mockUserService.findIncomingEmailById.mockResolvedValue(mockEmail);
      mockClaudeService.executeUnsubscribe.mockResolvedValue({
        success: true,
        message: 'Successfully unsubscribed',
        stepsExecuted: 2,
      });

      await handler.handleUnsubscribeEmail({ emailId: 'email-123' });

      expect(mockUserService.findIncomingEmailById).toHaveBeenCalledWith('email-123', [
        'credential',
      ]);
      expect(mockClaudeService.executeUnsubscribe).toHaveBeenCalledWith(
        mockEmail.htmlText,
        mockEmail.subject,
        mockEmail.from,
      );
    });

    it('should skip if email not found', async () => {
      mockUserService.findIncomingEmailById.mockResolvedValue(null);

      await handler.handleUnsubscribeEmail({ emailId: 'nonexistent-id' });

      expect(mockClaudeService.executeUnsubscribe).not.toHaveBeenCalled();
    });

    it('should skip if email has no unsubscribe option', async () => {
      const mockEmail = createMockIncomingEmail({
        hasUnsubscribe: false,
      });

      mockUserService.findIncomingEmailById.mockResolvedValue(mockEmail);

      await handler.handleUnsubscribeEmail({ emailId: 'email-123' });

      expect(mockClaudeService.executeUnsubscribe).not.toHaveBeenCalled();
    });

    it('should handle unsubscribe failure', async () => {
      const mockEmail = createMockIncomingEmail({
        hasUnsubscribe: true,
      });

      mockUserService.findIncomingEmailById.mockResolvedValue(mockEmail);
      mockClaudeService.executeUnsubscribe.mockResolvedValue({
        success: false,
        message: 'Could not find unsubscribe link',
        stepsExecuted: 1,
      });

      await handler.handleUnsubscribeEmail({ emailId: 'email-123' });

      expect(mockClaudeService.executeUnsubscribe).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockUserService.findIncomingEmailById.mockRejectedValue(new Error('Database error'));

      await expect(
        handler.handleUnsubscribeEmail({ emailId: 'email-123' }),
      ).resolves.not.toThrow();
    });

    it('should handle Claude service errors gracefully', async () => {
      const mockEmail = createMockIncomingEmail({
        hasUnsubscribe: true,
      });

      mockUserService.findIncomingEmailById.mockResolvedValue(mockEmail);
      mockClaudeService.executeUnsubscribe.mockRejectedValue(new Error('API Error'));

      await expect(
        handler.handleUnsubscribeEmail({ emailId: 'email-123' }),
      ).resolves.not.toThrow();
    });
  });
});
