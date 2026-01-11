import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './user.controller';
import { UserService } from './user.service';
import {
  createMockCredential,
  createMockEmailCategory,
  createMockIncomingEmail,
  createMockResponse,
  createMockRequest,
} from '../test/test-utils';

describe('UsersController', () => {
  let controller: UsersController;
  let userService: jest.Mocked<UserService>;

  const mockUserService = {
    findCredentialsByUserId: jest.fn(),
    findIncomingEmailsByCategoryId: jest.fn(),
    findUncategorizedEmailsByUserId: jest.fn(),
    bulkDeleteEmails: jest.fn(),
    bulkUnsubscribeEmails: jest.fn(),
    findAllIncomingEmailsByUserId: jest.fn(),
    findIncomingEmailById: jest.fn(),
    createEmailCategory: jest.fn(),
    findAllEmailCategoriesByUserId: jest.fn(),
    findEmailCategoryById: jest.fn(),
    updateEmailCategory: jest.fn(),
    deleteEmailCategory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    userService = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyCredentials', () => {
    it('should return user credentials', async () => {
      const mockCredentials = [
        createMockCredential(),
        createMockCredential({ id: 'cred-2' }),
      ];
      mockUserService.findCredentialsByUserId.mockResolvedValue(
        mockCredentials,
      );

      const res = createMockResponse();
      const req = createMockRequest();

      await controller.getMyCredentials(res, req);

      expect(mockUserService.findCredentialsByUserId).toHaveBeenCalledWith(
        'test-user-id',
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockCredentials);
    });

    it('should handle errors and return 400', async () => {
      const error = new Error('Database error');
      mockUserService.findCredentialsByUserId.mockRejectedValue(error);

      const res = createMockResponse();
      const req = createMockRequest();

      await controller.getMyCredentials(res, req);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        JSON.stringify({ message: 'Database error' }),
      );
    });
  });

  describe('getIncomingEmailsByCategory', () => {
    it('should return emails by category', async () => {
      const mockEmails = [createMockIncomingEmail()];
      mockUserService.findIncomingEmailsByCategoryId.mockResolvedValue(
        mockEmails,
      );

      const res = createMockResponse();
      const req = createMockRequest();

      await controller.getIncomingEmailsByCategory(res, 'category-id', req);

      expect(
        mockUserService.findIncomingEmailsByCategoryId,
      ).toHaveBeenCalledWith('category-id', 'test-user-id');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockEmails);
    });
  });

  describe('getUncategorizedEmails', () => {
    it('should return uncategorized emails', async () => {
      const mockEmails = [createMockIncomingEmail({ category: null })];
      mockUserService.findUncategorizedEmailsByUserId.mockResolvedValue(
        mockEmails,
      );

      const res = createMockResponse();
      const req = createMockRequest();

      await controller.getUncategorizedEmails(res, req);

      expect(
        mockUserService.findUncategorizedEmailsByUserId,
      ).toHaveBeenCalledWith('test-user-id');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockEmails);
    });
  });

  describe('bulkDeleteEmails', () => {
    it('should bulk delete emails', async () => {
      const mockResult = { deleted: 3, queued: 3 };
      mockUserService.bulkDeleteEmails.mockResolvedValue(mockResult);

      const res = createMockResponse();
      const body = { ids: ['id-1', 'id-2', 'id-3'] };

      await controller.bulkDeleteEmails(res, body, 'test-user-id');

      expect(mockUserService.bulkDeleteEmails).toHaveBeenCalledWith([
        'id-1',
        'id-2',
        'id-3',
      ]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('bulkUnsubscribeEmails', () => {
    it('should bulk unsubscribe from emails', async () => {
      const mockResult = { updated: 2, queued: 2 };
      mockUserService.bulkUnsubscribeEmails.mockResolvedValue(mockResult);

      const res = createMockResponse();
      const body = { ids: ['id-1', 'id-2'] };

      await controller.bulkUnsubscribeEmails(res, body, 'test-user-id');

      expect(mockUserService.bulkUnsubscribeEmails).toHaveBeenCalledWith([
        'id-1',
        'id-2',
      ]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getAllMyIncomingEmails', () => {
    it('should return all incoming emails for user', async () => {
      const mockEmails = [
        createMockIncomingEmail(),
        createMockIncomingEmail({ id: 'email-2' }),
      ];
      mockUserService.findAllIncomingEmailsByUserId.mockResolvedValue(
        mockEmails,
      );

      const res = createMockResponse();
      const req = createMockRequest();

      await controller.getAllMyIncomingEmails(res, req);

      expect(
        mockUserService.findAllIncomingEmailsByUserId,
      ).toHaveBeenCalledWith('test-user-id');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockEmails);
    });
  });

  describe('getIncomingEmail', () => {
    it('should return a single incoming email', async () => {
      const mockEmail = createMockIncomingEmail();
      mockUserService.findIncomingEmailById.mockResolvedValue(mockEmail);

      const res = createMockResponse();

      await controller.getIncomingEmail(res, 'email-id');

      expect(mockUserService.findIncomingEmailById).toHaveBeenCalledWith(
        'email-id',
        ['credential'],
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockEmail);
    });
  });

  describe('Email Category Endpoints', () => {
    describe('createEmailCategory', () => {
      it('should create a new email category', async () => {
        const mockCategory = createMockEmailCategory();
        mockUserService.createEmailCategory.mockResolvedValue(mockCategory);

        const res = createMockResponse();
        const req = createMockRequest();
        const dto = { name: 'Test Category', description: 'Test description' };

        await controller.createEmailCategory(res, req, dto);

        expect(mockUserService.createEmailCategory).toHaveBeenCalledWith(
          'test-user-id',
          dto,
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(mockCategory);
      });
    });

    describe('getMyEmailCategories', () => {
      it('should return all email categories for user', async () => {
        const mockCategories = [createMockEmailCategory()];
        mockUserService.findAllEmailCategoriesByUserId.mockResolvedValue(
          mockCategories,
        );

        const res = createMockResponse();
        const req = createMockRequest();

        await controller.getMyEmailCategories(res, req);

        expect(
          mockUserService.findAllEmailCategoriesByUserId,
        ).toHaveBeenCalledWith('test-user-id');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(mockCategories);
      });
    });

    describe('getEmailCategory', () => {
      it('should return a single email category', async () => {
        const mockCategory = createMockEmailCategory();
        mockUserService.findEmailCategoryById.mockResolvedValue(mockCategory);

        const res = createMockResponse();

        await controller.getEmailCategory(res, 'category-id');

        expect(mockUserService.findEmailCategoryById).toHaveBeenCalledWith(
          'category-id',
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(mockCategory);
      });
    });

    describe('updateEmailCategory', () => {
      it('should update an email category', async () => {
        const mockCategory = createMockEmailCategory({ name: 'Updated Name' });
        mockUserService.updateEmailCategory.mockResolvedValue(mockCategory);

        const res = createMockResponse();
        const dto = { name: 'Updated Name' };

        await controller.updateEmailCategory(res, 'category-id', dto);

        expect(mockUserService.updateEmailCategory).toHaveBeenCalledWith(
          'category-id',
          dto,
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(mockCategory);
      });
    });

    describe('deleteEmailCategory', () => {
      it('should delete an email category', async () => {
        const mockResult = { deleted: true };
        mockUserService.deleteEmailCategory.mockResolvedValue(mockResult);

        const res = createMockResponse();

        await controller.deleteEmailCategory(res, 'category-id');

        expect(mockUserService.deleteEmailCategory).toHaveBeenCalledWith(
          'category-id',
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(mockResult);
      });
    });
  });
});
