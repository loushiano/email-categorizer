import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClaudeService, EmailCategory, EmailAnalysisResult } from './claude.service';
import { createMockConfigService } from '../test/test-utils';

// Mock Anthropic SDK
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  }));
});

// Mock global fetch for unsubscribe tests
global.fetch = jest.fn();

describe('ClaudeService', () => {
  let service: ClaudeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaudeService,
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
      ],
    }).compile();

    service = module.get<ClaudeService>(ClaudeService);
    jest.clearAllMocks();
  });

  describe('analyzeEmail', () => {
    const mockCategories: EmailCategory[] = [
      { name: 'Newsletter', description: 'Email newsletters and updates' },
      { name: 'Receipts', description: 'Purchase receipts and invoices' },
      { name: 'Social', description: 'Social media notifications' },
    ];

    it('should analyze email and return analysis result', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              categoryName: 'Newsletter',
              summary: 'This is a weekly newsletter from Company X.',
              hasUnsubscribe: true,
            }),
          },
        ],
      });

      const result = await service.analyzeEmail(
        '<p>Weekly newsletter content</p>',
        'Weekly newsletter content',
        'Weekly Newsletter',
        mockCategories,
      );

      expect(result).toEqual({
        categoryName: 'Newsletter',
        summary: 'This is a weekly newsletter from Company X.',
        hasUnsubscribe: true,
      });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: expect.any(Array),
        }),
      );
    });

    it('should return empty result for empty email content', async () => {
      const result = await service.analyzeEmail('', '', 'Test Subject', mockCategories);

      expect(result).toEqual({
        categoryName: null,
        summary: 'Empty email content',
        hasUnsubscribe: false,
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should handle null category response', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              categoryName: null,
              summary: 'Uncategorized email',
              hasUnsubscribe: false,
            }),
          },
        ],
      });

      const result = await service.analyzeEmail(
        '<p>Random content</p>',
        'Random content',
        'Random Subject',
        mockCategories,
      );

      expect(result.categoryName).toBeNull();
    });

    it('should validate category against available categories (case-insensitive)', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              categoryName: 'NEWSLETTER', // uppercase
              summary: 'Newsletter email',
              hasUnsubscribe: true,
            }),
          },
        ],
      });

      const result = await service.analyzeEmail(
        '<p>Content</p>',
        'Content',
        'Subject',
        mockCategories,
      );

      expect(result.categoryName).toBe('Newsletter'); // Should normalize to actual category name
    });

    it('should return null for invalid category', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              categoryName: 'InvalidCategory',
              summary: 'Some summary',
              hasUnsubscribe: false,
            }),
          },
        ],
      });

      const result = await service.analyzeEmail(
        '<p>Content</p>',
        'Content',
        'Subject',
        mockCategories,
      );

      expect(result.categoryName).toBeNull();
    });

    it('should handle markdown code blocks in response', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```json\n{"categoryName": "Receipts", "summary": "Purchase receipt", "hasUnsubscribe": false}\n```',
          },
        ],
      });

      const result = await service.analyzeEmail(
        '<p>Receipt</p>',
        'Receipt',
        'Your Receipt',
        mockCategories,
      );

      expect(result.categoryName).toBe('Receipts');
    });

    it('should handle API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      await expect(
        service.analyzeEmail('<p>Content</p>', 'Content', 'Subject', mockCategories),
      ).rejects.toThrow('API Error');
    });

    it('should handle malformed JSON response', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'not valid json',
          },
        ],
      });

      const result = await service.analyzeEmail(
        '<p>Content</p>',
        'Content',
        'Subject',
        mockCategories,
      );

      expect(result).toEqual({
        categoryName: null,
        summary: 'Unable to analyze email',
        hasUnsubscribe: false,
      });
    });

    it('should use HTML content if text is empty', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              categoryName: 'Newsletter',
              summary: 'Summary',
              hasUnsubscribe: false,
            }),
          },
        ],
      });

      const result = await service.analyzeEmail(
        '<p>HTML only</p>',
        '', // Empty text
        'Subject',
        mockCategories,
      );

      expect(result.categoryName).toBe('Newsletter');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should use text content if HTML is empty', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              categoryName: 'Social',
              summary: 'Social notification',
              hasUnsubscribe: true,
            }),
          },
        ],
      });

      const result = await service.analyzeEmail(
        '', // Empty HTML
        'Plain text content',
        'Subject',
        mockCategories,
      );

      expect(result.categoryName).toBe('Social');
    });

    it('should handle empty categories array', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              categoryName: null,
              summary: 'Summary',
              hasUnsubscribe: false,
            }),
          },
        ],
      });

      const result = await service.analyzeEmail(
        '<p>Content</p>',
        'Content',
        'Subject',
        [], // Empty categories
      );

      expect(result.categoryName).toBeNull();
    });
  });

  describe('executeUnsubscribe', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockReset();
    });

    it('should execute unsubscribe successfully', async () => {
      // First call: Model finds unsubscribe link and calls fetch_url
      mockCreate.mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'fetch_url',
            input: { url: 'https://example.com/unsubscribe?token=123', method: 'GET' },
          },
        ],
      });

      // Mock fetch response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        url: 'https://example.com/unsubscribe-success',
        text: () => Promise.resolve('<html><body>Successfully unsubscribed!</body></html>'),
      });

      // Second call: Model completes unsubscribe
      mockCreate.mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tool-2',
            name: 'complete_unsubscribe',
            input: { success: true, message: 'Successfully unsubscribed from newsletter' },
          },
        ],
      });

      const result = await service.executeUnsubscribe(
        '<p>Unsubscribe <a href="https://example.com/unsubscribe?token=123">here</a></p>',
        'Newsletter',
        'newsletter@example.com',
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Successfully unsubscribed from newsletter');
      expect(result.stepsExecuted).toBeGreaterThanOrEqual(1);
    });

    it('should handle failed unsubscribe', async () => {
      mockCreate.mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'complete_unsubscribe',
            input: { success: false, message: 'Could not find unsubscribe link' },
          },
        ],
      });

      const result = await service.executeUnsubscribe(
        '<p>Email content without unsubscribe link</p>',
        'Test Email',
        'sender@example.com',
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Could not find unsubscribe link');
    });

    it('should handle max steps reached', async () => {
      // Mock 10 fetch_url calls without completing
      for (let i = 0; i < 10; i++) {
        mockCreate.mockResolvedValueOnce({
          stop_reason: 'tool_use',
          content: [
            {
              type: 'tool_use',
              id: `tool-${i}`,
              name: 'fetch_url',
              input: { url: `https://example.com/step${i}`, method: 'GET' },
            },
          ],
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          url: `https://example.com/step${i}`,
          text: () => Promise.resolve('<html><body>Next step...</body></html>'),
        });
      }

      const result = await service.executeUnsubscribe(
        '<p>Content</p>',
        'Subject',
        'sender@example.com',
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Maximum steps');
      expect(result.stepsExecuted).toBe(10);
    });

    it('should handle model stopping without completion', async () => {
      mockCreate.mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [
          {
            type: 'text',
            text: 'I cannot find an unsubscribe link.',
          },
        ],
      });

      const result = await service.executeUnsubscribe(
        '<p>Content</p>',
        'Subject',
        'sender@example.com',
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unsubscribe process did not complete normally');
    });

    it('should handle API errors during unsubscribe', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.executeUnsubscribe(
        '<p>Content</p>',
        'Subject',
        'sender@example.com',
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error:');
    });

    it('should handle fetch URL errors', async () => {
      mockCreate.mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'fetch_url',
            input: { url: 'https://invalid-url.com', method: 'GET' },
          },
        ],
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      mockCreate.mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tool-2',
            name: 'complete_unsubscribe',
            input: { success: false, message: 'Failed to fetch URL' },
          },
        ],
      });

      const result = await service.executeUnsubscribe(
        '<p>Content</p>',
        'Subject',
        'sender@example.com',
      );

      expect(result.success).toBe(false);
    });

    it('should handle POST requests with form data', async () => {
      mockCreate.mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'fetch_url',
            input: {
              url: 'https://example.com/unsubscribe',
              method: 'POST',
              body: { email: 'user@example.com', action: 'unsubscribe' },
            },
          },
        ],
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        url: 'https://example.com/unsubscribe-success',
        text: () => Promise.resolve('<html>Unsubscribed!</html>'),
      });

      mockCreate.mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tool-2',
            name: 'complete_unsubscribe',
            input: { success: true, message: 'Unsubscribed via form' },
          },
        ],
      });

      const result = await service.executeUnsubscribe(
        '<form action="/unsubscribe" method="POST">...</form>',
        'Subject',
        'sender@example.com',
      );

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/unsubscribe',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        }),
      );
    });

    it('should truncate long fetch responses', async () => {
      mockCreate.mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'fetch_url',
            input: { url: 'https://example.com/page', method: 'GET' },
          },
        ],
      });

      const longContent = 'x'.repeat(10000); // Very long content
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        url: 'https://example.com/page',
        text: () => Promise.resolve(longContent),
      });

      mockCreate.mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tool-2',
            name: 'complete_unsubscribe',
            input: { success: true, message: 'Done' },
          },
        ],
      });

      await service.executeUnsubscribe('<p>Content</p>', 'Subject', 'sender@example.com');

      // Just verify it completes without error
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('parseResponse (private method tested through analyzeEmail)', () => {
    it('should handle response with ```json prefix', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```json\n{"categoryName": "Newsletter", "summary": "Test", "hasUnsubscribe": true}\n```',
          },
        ],
      });

      const result = await service.analyzeEmail(
        '<p>Content</p>',
        'Content',
        'Subject',
        [{ name: 'Newsletter', description: 'desc' }],
      );

      expect(result.categoryName).toBe('Newsletter');
    });

    it('should handle response with ``` prefix only', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```\n{"categoryName": "Newsletter", "summary": "Test", "hasUnsubscribe": true}\n```',
          },
        ],
      });

      const result = await service.analyzeEmail(
        '<p>Content</p>',
        'Content',
        'Subject',
        [{ name: 'Newsletter', description: 'desc' }],
      );

      expect(result.categoryName).toBe('Newsletter');
    });

    it('should provide default summary when missing', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '{"categoryName": null, "hasUnsubscribe": false}', // Missing summary
          },
        ],
      });

      const result = await service.analyzeEmail('<p>Content</p>', 'Content', 'Subject', []);

      expect(result.summary).toBe('Unable to generate summary');
    });
  });
});
