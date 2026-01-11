import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { UserCredential } from './userCredendtial.entity';
import { UserEmailCategory } from './userEmailCategory.entity';
import { UserIncomingEmail } from './userIncomingEmail.entity';
import { QueuePublisher } from '../queue/queue.publisher';
import { Events } from '../queue/queue-constants';
import { UserStatus } from '../utils/constants';
import {
  createMockUser,
  createMockCredential,
  createMockEmailCategory,
  createMockIncomingEmail,
  createMockRepository,
  createMockQueuePublisher,
} from '../test/test-utils';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;
  let credentialRepository: jest.Mocked<Repository<UserCredential>>;
  let emailCategoryRepository: jest.Mocked<Repository<UserEmailCategory>>;
  let incomingEmailRepository: jest.Mocked<Repository<UserIncomingEmail>>;
  let queuePublisher: jest.Mocked<QueuePublisher>;

  beforeEach(async () => {
    const mockUserRepo = createMockRepository();
    const mockCredentialRepo = createMockRepository();
    const mockEmailCategoryRepo = createMockRepository();
    const mockIncomingEmailRepo = createMockRepository();
    const mockQueuePublisher = createMockQueuePublisher();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(UserCredential),
          useValue: mockCredentialRepo,
        },
        {
          provide: getRepositoryToken(UserEmailCategory),
          useValue: mockEmailCategoryRepo,
        },
        {
          provide: getRepositoryToken(UserIncomingEmail),
          useValue: mockIncomingEmailRepo,
        },
        {
          provide: QueuePublisher,
          useValue: mockQueuePublisher,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
    credentialRepository = module.get(getRepositoryToken(UserCredential));
    emailCategoryRepository = module.get(getRepositoryToken(UserEmailCategory));
    incomingEmailRepository = module.get(getRepositoryToken(UserIncomingEmail));
    queuePublisher = module.get(QueuePublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const mockUser = createMockUser();
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: [],
      });
      expect(result).toEqual(mockUser);
    });

    it('should find a user by email with extra conditions and relations', async () => {
      const mockUser = createMockUser();
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(
        'test@example.com',
        { status: UserStatus.VALID },
        ['credentials'],
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com', status: UserStatus.VALID },
        relations: ['credentials'],
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find a user by id', async () => {
      const mockUser = createMockUser();
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('test-user-id');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        relations: [],
      });
      expect(result).toEqual(mockUser);
    });

    it('should find a user by id with relations', async () => {
      const mockUser = createMockUser();
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('test-user-id', {}, ['credentials', 'emailCategories']);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        relations: ['credentials', 'emailCategories'],
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('saveUser', () => {
    it('should save a user', async () => {
      const mockUser = createMockUser();
      userRepository.save.mockResolvedValue(mockUser);

      await service.saveUser(mockUser);

      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('createUserFromGoogle', () => {
    it('should create a new user when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const savedUser = createMockUser({
        email: 'new@example.com',
        fname: 'New',
        lname: 'User',
      });
      userRepository.save.mockResolvedValue(savedUser);

      const result = await service.createUserFromGoogle({
        email: 'NEW@EXAMPLE.COM',
        fname: 'New',
        lname: 'User',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
        relations: ['credentials'],
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toEqual(savedUser);
    });

    it('should return existing user when user already exists', async () => {
      const existingUser = createMockUser();
      userRepository.findOne.mockResolvedValue(existingUser);

      const result = await service.createUserFromGoogle({
        email: 'test@example.com',
        fname: 'Test',
        lname: 'User',
      });

      expect(userRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual(existingUser);
    });

    it('should lowercase the email', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const savedUser = createMockUser();
      userRepository.save.mockResolvedValue(savedUser);

      await service.createUserFromGoogle({
        email: 'TEST@EXAMPLE.COM',
        fname: 'Test',
        lname: 'User',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: ['credentials'],
      });
    });
  });

  describe('Credential Methods', () => {
    describe('saveCredential', () => {
      it('should save a credential', async () => {
        const mockCredential = createMockCredential();
        credentialRepository.save.mockResolvedValue(mockCredential);

        const result = await service.saveCredential(mockCredential);

        expect(credentialRepository.save).toHaveBeenCalledWith(mockCredential);
        expect(result).toEqual(mockCredential);
      });
    });

    describe('findCredentialByInboxEmail', () => {
      it('should find a credential by inbox email', async () => {
        const mockCredential = createMockCredential();
        credentialRepository.findOne.mockResolvedValue(mockCredential);

        const result = await service.findCredentialByInboxEmail('inbox@example.com');

        expect(credentialRepository.findOne).toHaveBeenCalledWith({
          where: { inboxEmail: 'inbox@example.com' },
          relations: [],
        });
        expect(result).toEqual(mockCredential);
      });

      it('should find a credential with relations', async () => {
        const mockCredential = createMockCredential();
        credentialRepository.findOne.mockResolvedValue(mockCredential);

        const result = await service.findCredentialByInboxEmail('inbox@example.com', ['user']);

        expect(credentialRepository.findOne).toHaveBeenCalledWith({
          where: { inboxEmail: 'inbox@example.com' },
          relations: ['user'],
        });
        expect(result).toEqual(mockCredential);
      });
    });

    describe('findCredentialById', () => {
      it('should find a credential by id', async () => {
        const mockCredential = createMockCredential();
        credentialRepository.findOne.mockResolvedValue(mockCredential);

        const result = await service.findCredentialById('test-credential-id');

        expect(credentialRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'test-credential-id' },
          relations: [],
        });
        expect(result).toEqual(mockCredential);
      });
    });

    describe('findCredentialsByUserId', () => {
      it('should find all credentials for a user', async () => {
        const mockCredentials = [createMockCredential(), createMockCredential({ id: 'cred-2' })];
        credentialRepository.find.mockResolvedValue(mockCredentials);

        const result = await service.findCredentialsByUserId('test-user-id');

        expect(credentialRepository.find).toHaveBeenCalledWith({
          where: { user: { id: 'test-user-id' } },
          relations: [],
        });
        expect(result).toEqual(mockCredentials);
      });
    });
  });

  describe('Email Category Methods', () => {
    describe('createEmailCategory', () => {
      it('should create a new email category', async () => {
        const mockUser = createMockUser();
        const mockCategory = createMockEmailCategory();
        userRepository.findOne.mockResolvedValue(mockUser);
        emailCategoryRepository.save.mockResolvedValue(mockCategory);

        const result = await service.createEmailCategory('test-user-id', {
          name: 'Test Category',
          description: 'A test category',
        });

        expect(userRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'test-user-id' },
        });
        expect(emailCategoryRepository.save).toHaveBeenCalled();
        expect(result).toEqual(mockCategory);
      });

      it('should throw NotFoundException when user not found', async () => {
        userRepository.findOne.mockResolvedValue(null);

        await expect(
          service.createEmailCategory('nonexistent-user-id', {
            name: 'Test Category',
          }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('findAllEmailCategoriesByUserId', () => {
      it('should find all categories for a user', async () => {
        const mockCategories = [createMockEmailCategory(), createMockEmailCategory({ id: 'cat-2' })];
        emailCategoryRepository.find.mockResolvedValue(mockCategories);

        const result = await service.findAllEmailCategoriesByUserId('test-user-id');

        expect(emailCategoryRepository.find).toHaveBeenCalledWith({
          where: { user: { id: 'test-user-id' } },
        });
        expect(result).toEqual(mockCategories);
      });
    });

    describe('findEmailCategoryById', () => {
      it('should find a category by id', async () => {
        const mockCategory = createMockEmailCategory();
        emailCategoryRepository.findOne.mockResolvedValue(mockCategory);

        const result = await service.findEmailCategoryById('test-category-id');

        expect(emailCategoryRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'test-category-id' },
          relations: ['user'],
        });
        expect(result).toEqual(mockCategory);
      });

      it('should throw NotFoundException when category not found', async () => {
        emailCategoryRepository.findOne.mockResolvedValue(null);

        await expect(service.findEmailCategoryById('nonexistent-id')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('updateEmailCategory', () => {
      it('should update a category name', async () => {
        const mockCategory = createMockEmailCategory();
        emailCategoryRepository.findOne.mockResolvedValue(mockCategory);
        emailCategoryRepository.save.mockResolvedValue({
          ...mockCategory,
          name: 'Updated Name',
        });

        const result = await service.updateEmailCategory('test-category-id', {
          name: 'Updated Name',
        });

        expect(emailCategoryRepository.save).toHaveBeenCalled();
        expect(result.name).toBe('Updated Name');
      });

      it('should update a category description', async () => {
        const mockCategory = createMockEmailCategory();
        emailCategoryRepository.findOne.mockResolvedValue(mockCategory);
        emailCategoryRepository.save.mockResolvedValue({
          ...mockCategory,
          description: 'Updated Description',
        });

        const result = await service.updateEmailCategory('test-category-id', {
          description: 'Updated Description',
        });

        expect(result.description).toBe('Updated Description');
      });

      it('should throw NotFoundException when category not found', async () => {
        emailCategoryRepository.findOne.mockResolvedValue(null);

        await expect(
          service.updateEmailCategory('nonexistent-id', { name: 'Test' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteEmailCategory', () => {
      it('should delete a category and uncategorize its emails', async () => {
        const mockCategory = createMockEmailCategory();
        emailCategoryRepository.findOne.mockResolvedValue(mockCategory);

        const mockQueryBuilder = {
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 2 }),
        };
        incomingEmailRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        emailCategoryRepository.remove.mockResolvedValue(mockCategory);

        const result = await service.deleteEmailCategory('test-category-id');

        expect(mockQueryBuilder.update).toHaveBeenCalled();
        expect(mockQueryBuilder.set).toHaveBeenCalledWith({ category: null });
        expect(emailCategoryRepository.remove).toHaveBeenCalledWith(mockCategory);
        expect(result).toEqual({ deleted: true });
      });
    });
  });

  describe('Incoming Email Methods', () => {
    describe('saveIncomingEmail', () => {
      it('should save an incoming email', async () => {
        const mockCredential = createMockCredential();
        const mockEmail = createMockIncomingEmail();
        incomingEmailRepository.save.mockResolvedValue(mockEmail);

        const result = await service.saveIncomingEmail({
          credential: mockCredential,
          from: 'sender@example.com',
          subject: 'Test Subject',
          htmlText: '<p>HTML</p>',
          text: 'Text',
          messageId: 'msg-123',
          creationDate: Date.now(),
          attachments: [],
        });

        expect(incomingEmailRepository.save).toHaveBeenCalled();
        expect(result).toEqual(mockEmail);
      });
    });

    describe('findIncomingEmailById', () => {
      it('should find an incoming email by id', async () => {
        const mockEmail = createMockIncomingEmail();
        incomingEmailRepository.findOne.mockResolvedValue(mockEmail);

        const result = await service.findIncomingEmailById('test-email-id');

        expect(incomingEmailRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'test-email-id' },
          relations: [],
        });
        expect(result).toEqual(mockEmail);
      });
    });

    describe('findIncomingEmailByMessageId', () => {
      it('should find an incoming email by message id', async () => {
        const mockEmail = createMockIncomingEmail();
        incomingEmailRepository.findOne.mockResolvedValue(mockEmail);

        const result = await service.findIncomingEmailByMessageId('msg-123');

        expect(incomingEmailRepository.findOne).toHaveBeenCalledWith({
          where: { messageId: 'msg-123' },
        });
        expect(result).toEqual(mockEmail);
      });
    });

    describe('findIncomingEmailsByCredentialId', () => {
      it('should find all incoming emails for a credential', async () => {
        const mockEmails = [createMockIncomingEmail(), createMockIncomingEmail({ id: 'email-2' })];
        incomingEmailRepository.find.mockResolvedValue(mockEmails);

        const result = await service.findIncomingEmailsByCredentialId('test-credential-id');

        expect(incomingEmailRepository.find).toHaveBeenCalledWith({
          where: { credential: { id: 'test-credential-id' } },
          relations: [],
          order: { creationDate: 'DESC' },
        });
        expect(result).toEqual(mockEmails);
      });
    });

    describe('findAllIncomingEmailsByUserId', () => {
      it('should find all incoming emails for a user', async () => {
        const mockEmails = [createMockIncomingEmail()];
        incomingEmailRepository.find.mockResolvedValue(mockEmails);

        const result = await service.findAllIncomingEmailsByUserId('test-user-id');

        expect(incomingEmailRepository.find).toHaveBeenCalledWith({
          where: { credential: { user: { id: 'test-user-id' } } },
          relations: ['credential', 'category'],
          order: { creationDate: 'DESC' },
        });
        expect(result).toEqual(mockEmails);
      });
    });

    describe('findIncomingEmailsByCategoryId', () => {
      it('should find all emails in a category', async () => {
        const mockCategory = createMockEmailCategory();
        const mockEmails = [createMockIncomingEmail()];
        emailCategoryRepository.findOne.mockResolvedValue(mockCategory);
        incomingEmailRepository.find.mockResolvedValue(mockEmails);

        const result = await service.findIncomingEmailsByCategoryId('test-category-id', 'test-user-id');

        expect(emailCategoryRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'test-category-id', user: { id: 'test-user-id' } },
        });
        expect(result).toEqual(mockEmails);
      });

      it('should throw NotFoundException when category not found', async () => {
        emailCategoryRepository.findOne.mockResolvedValue(null);

        await expect(
          service.findIncomingEmailsByCategoryId('nonexistent-id', 'test-user-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('findUncategorizedEmailsByUserId', () => {
      it('should find uncategorized emails for a user', async () => {
        const mockEmails = [createMockIncomingEmail({ category: null })];
        const mockQueryBuilder = {
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(mockEmails),
        };
        incomingEmailRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        const result = await service.findUncategorizedEmailsByUserId('test-user-id');

        expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('email.credential', 'credential');
        expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('email.category', 'category');
        expect(mockQueryBuilder.where).toHaveBeenCalledWith('credential.user.id = :userId', {
          userId: 'test-user-id',
        });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('email.category IS NULL');
        expect(result).toEqual(mockEmails);
      });
    });

    describe('updateIncomingEmailAnalysis', () => {
      it('should update email analysis data', async () => {
        const mockEmail = createMockIncomingEmail();
        const mockCategory = createMockEmailCategory();
        incomingEmailRepository.findOne.mockResolvedValue(mockEmail);
        incomingEmailRepository.save.mockResolvedValue({
          ...mockEmail,
          summary: 'Test summary',
          hasUnsubscribe: true,
          category: mockCategory,
          isProcessed: true,
        });

        const result = await service.updateIncomingEmailAnalysis('test-email-id', {
          summary: 'Test summary',
          hasUnsubscribe: true,
          category: mockCategory,
          isProcessed: true,
        });

        expect(incomingEmailRepository.save).toHaveBeenCalled();
        expect(result.summary).toBe('Test summary');
        expect(result.hasUnsubscribe).toBe(true);
        expect(result.isProcessed).toBe(true);
      });

      it('should throw NotFoundException when email not found', async () => {
        incomingEmailRepository.findOne.mockResolvedValue(null);

        await expect(
          service.updateIncomingEmailAnalysis('nonexistent-id', {
            summary: 'Test',
            hasUnsubscribe: false,
            category: null,
            isProcessed: true,
          }),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('bulkDeleteEmails', () => {
      it('should return zero counts for empty ids array', async () => {
        const result = await service.bulkDeleteEmails([]);

        expect(result).toEqual({ deleted: 0, queued: 0 });
        expect(incomingEmailRepository.find).not.toHaveBeenCalled();
      });

      it('should delete emails and queue Gmail deletion', async () => {
        const mockCredential = createMockCredential();
        const mockEmails = [
          createMockIncomingEmail({ messageId: 'msg-1', credential: mockCredential }),
          createMockIncomingEmail({ id: 'email-2', messageId: 'msg-2', credential: mockCredential }),
        ];
        incomingEmailRepository.find.mockResolvedValue(mockEmails);

        const mockQueryBuilder = {
          delete: jest.fn().mockReturnThis(),
          whereInIds: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 2 }),
        };
        incomingEmailRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        const result = await service.bulkDeleteEmails(['email-1', 'email-2']);

        expect(queuePublisher.publish).toHaveBeenCalledTimes(2);
        expect(queuePublisher.publish).toHaveBeenCalledWith(Events.DELETE_GMAIL_MESSAGE, {
          messageId: 'msg-1',
          credentialId: mockCredential.id,
        });
        expect(result).toEqual({ deleted: 2, queued: 2 });
      });

      it('should not queue deletion for emails without messageId', async () => {
        const mockEmails = [createMockIncomingEmail({ messageId: null, credential: null })];
        incomingEmailRepository.find.mockResolvedValue(mockEmails);

        const mockQueryBuilder = {
          delete: jest.fn().mockReturnThis(),
          whereInIds: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        };
        incomingEmailRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        const result = await service.bulkDeleteEmails(['email-1']);

        expect(queuePublisher.publish).not.toHaveBeenCalled();
        expect(result).toEqual({ deleted: 1, queued: 0 });
      });
    });

    describe('bulkUnsubscribeEmails', () => {
      it('should return zero counts for empty ids array', async () => {
        const result = await service.bulkUnsubscribeEmails([]);

        expect(result).toEqual({ updated: 0, queued: 0 });
      });

      it('should unsubscribe eligible emails and queue unsubscribe action', async () => {
        const mockEmails = [
          createMockIncomingEmail({
            id: 'email-1',
            hasUnsubscribe: true,
            unsubscribed: false,
          }),
          createMockIncomingEmail({
            id: 'email-2',
            hasUnsubscribe: true,
            unsubscribed: false,
          }),
        ];
        incomingEmailRepository.find.mockResolvedValue(mockEmails);

        const mockQueryBuilder = {
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          whereInIds: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 2 }),
        };
        incomingEmailRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        const result = await service.bulkUnsubscribeEmails(['email-1', 'email-2']);

        expect(mockQueryBuilder.set).toHaveBeenCalledWith({ unsubscribed: true });
        expect(queuePublisher.publish).toHaveBeenCalledTimes(2);
        expect(queuePublisher.publish).toHaveBeenCalledWith(Events.UNSUBSCRIBE_EMAIL, {
          emailId: 'email-1',
        });
        expect(result).toEqual({ updated: 2, queued: 2 });
      });

      it('should skip emails already unsubscribed', async () => {
        const mockEmails = [
          createMockIncomingEmail({
            id: 'email-1',
            hasUnsubscribe: true,
            unsubscribed: true, // Already unsubscribed
          }),
        ];
        incomingEmailRepository.find.mockResolvedValue(mockEmails);

        const result = await service.bulkUnsubscribeEmails(['email-1']);

        expect(queuePublisher.publish).not.toHaveBeenCalled();
        expect(result).toEqual({ updated: 0, queued: 0 });
      });

      it('should skip emails without unsubscribe capability', async () => {
        const mockEmails = [
          createMockIncomingEmail({
            id: 'email-1',
            hasUnsubscribe: false, // No unsubscribe option
            unsubscribed: false,
          }),
        ];
        incomingEmailRepository.find.mockResolvedValue(mockEmails);

        const result = await service.bulkUnsubscribeEmails(['email-1']);

        expect(queuePublisher.publish).not.toHaveBeenCalled();
        expect(result).toEqual({ updated: 0, queued: 0 });
      });
    });
  });
});
