import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserCredential } from './userCredendtial.entity';
import { UserEmailCategory } from './userEmailCategory.entity';
import { UserIncomingEmail } from './userIncomingEmail.entity';
import {
  CreateUserEmailCategoryDto,
  UpdateUserEmailCategoryDto,
} from './userEmailCategory.dto';
import { v4 as uuidv4 } from 'uuid';
import {
  UserStatus,
  UnsubscribeStatus,
  EmailProcessingStatus,
  EMAIL_LIMIT_PER_CREDENTIAL,
} from 'src/utils/constants';
import { QueuePublisher } from '../queue/queue.publisher';
import { Events } from '../queue/queue-constants';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserCredential)
    private credentialRepository: Repository<UserCredential>,
    @InjectRepository(UserEmailCategory)
    private emailCategoryRepository: Repository<UserEmailCategory>,
    @InjectRepository(UserIncomingEmail)
    private incomingEmailRepository: Repository<UserIncomingEmail>,
    private queuePublisher: QueuePublisher,
  ) {}

  async findByEmail(email: string, extra = {}, relations = []) {
    return await this.userRepository.findOne({
      where: { email, ...extra },
      relations,
    });
  }
  async findById(id: string, extra = {}, relations = []) {
    return await this.userRepository.findOne({
      where: { id, ...extra },
      relations,
    });
  }

  async saveUser(user: User) {
    await this.userRepository.save(user);
  }

  async createUserFromGoogle(data: {
    email: string;
    fname: string;
    lname: string;
  }) {
    const email = data.email.toLowerCase();
    let user = await this.userRepository.findOne({
      where: { email },
      relations: ['credentials'],
    });

    if (!user) {
      user = new User();
      user.id = uuidv4();
      user.email = email;
      user.fname = data.fname;
      user.lname = data.lname;
      user.status = UserStatus.VALID;
      user = await this.userRepository.save(user);
    }
    return user;
  }

  async saveCredential(credential: UserCredential) {
    return await this.credentialRepository.save(credential);
  }

  async findCredentialByInboxEmail(
    inboxEmail: string,
    relations: string[] = [],
  ) {
    return await this.credentialRepository.findOne({
      where: { inboxEmail },
      relations,
    });
  }

  async findCredentialById(id: string, relations: string[] = []) {
    return await this.credentialRepository.findOne({
      where: { id },
      relations,
    });
  }

  async findCredentialsByUserId(userId: string, relations: string[] = []) {
    return await this.credentialRepository.find({
      where: { user: { id: userId } },
      relations,
    });
  }

  async findAllIncomingEmailsByUserId(
    userId: string,
    relations: string[] = [],
  ) {
    return await this.incomingEmailRepository.find({
      where: { credential: { user: { id: userId } } },
      relations: ['credential', 'category', ...relations],
      order: { creationDate: 'DESC' },
    });
  }

  // UserEmailCategory CRUD methods
  async createEmailCategory(userId: string, dto: CreateUserEmailCategoryDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const category = new UserEmailCategory();
    category.id = uuidv4();
    category.name = dto.name;
    category.description = dto.description;
    category.user = user;

    return await this.emailCategoryRepository.save(category);
  }

  async findAllEmailCategoriesByUserId(userId: string) {
    return await this.emailCategoryRepository.find({
      where: { user: { id: userId } },
    });
  }

  async findEmailCategoryById(id: string) {
    const category = await this.emailCategoryRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!category) {
      throw new NotFoundException(`Email category with id ${id} not found`);
    }
    return category;
  }

  async updateEmailCategory(id: string, dto: UpdateUserEmailCategoryDto) {
    const category = await this.findEmailCategoryById(id);

    if (dto.name !== undefined) {
      category.name = dto.name;
    }
    if (dto.description !== undefined) {
      category.description = dto.description;
    }

    return await this.emailCategoryRepository.save(category);
  }

  async deleteEmailCategory(id: string) {
    const category = await this.findEmailCategoryById(id);

    // Move all emails in this category to uncategorized (set category to null)
    await this.incomingEmailRepository
      .createQueryBuilder()
      .update()
      .set({ category: null })
      .where('categoryId = :categoryId', { categoryId: id })
      .execute();

    await this.emailCategoryRepository.remove(category);
    return { deleted: true };
  }

  // UserIncomingEmail methods
  async saveIncomingEmail(data: {
    credential: UserCredential;
    from: string;
    subject: string;
    htmlText: string;
    text: string;
    messageId: string;
    creationDate: number;
    attachments?: string[];
  }) {
    const incomingEmail = new UserIncomingEmail();
    incomingEmail.id = uuidv4();
    incomingEmail.credential = data.credential;
    incomingEmail.from = data.from;
    incomingEmail.subject = data.subject;
    incomingEmail.htmlText = data.htmlText;
    incomingEmail.text = data.text;
    incomingEmail.messageId = data.messageId;
    incomingEmail.creationDate = data.creationDate;
    incomingEmail.attachments = data.attachments || [];

    return await this.incomingEmailRepository.save(incomingEmail);
  }

  async findIncomingEmailById(id: string, relations: string[] = []) {
    return await this.incomingEmailRepository.findOne({
      where: { id },
      relations,
    });
  }

  async findIncomingEmailByMessageId(messageId: string) {
    return await this.incomingEmailRepository.findOne({
      where: { messageId },
    });
  }

  async findIncomingEmailsByCredentialId(
    credentialId: string,
    relations: string[] = [],
  ) {
    return await this.incomingEmailRepository.find({
      where: { credential: { id: credentialId } },
      relations,
      order: { creationDate: 'DESC' },
    });
  }

  async findIncomingEmailsByCategoryId(categoryId: string, userId: string) {
    // Get category to find credential
    const category = await this.emailCategoryRepository.findOne({
      where: { id: categoryId, user: { id: userId } },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${categoryId} not found`);
    }

    return await this.incomingEmailRepository.find({
      where: { category: { id: categoryId } },
      relations: ['credential', 'category'],
      order: { creationDate: 'DESC' },
    });
  }

  async findUncategorizedEmailsByUserId(userId: string) {
    console.log(userId);
    return await this.incomingEmailRepository
      .createQueryBuilder('email')
      .leftJoinAndSelect('email.credential', 'credential')
      .leftJoinAndSelect('email.category', 'category')
      .where('credential.user.id = :userId', { userId })
      .andWhere('email.category IS NULL')
      .orderBy('email.creationDate', 'DESC')
      .getMany();
  }

  async updateIncomingEmailAnalysis(
    id: string,
    data: {
      summary: string;
      hasUnsubscribe: boolean;
      category: UserEmailCategory | null;
      isProcessed: boolean;
    },
  ) {
    const email = await this.incomingEmailRepository.findOne({
      where: { id },
    });

    if (!email) {
      throw new NotFoundException(`Incoming email with id ${id} not found`);
    }

    email.summary = data.summary;
    email.hasUnsubscribe = data.hasUnsubscribe;
    email.category = data.category;
    email.isProcessed = data.isProcessed;
    email.processingStatus = EmailProcessingStatus.COMPLETED;
    email.processedAt = Date.now();

    return await this.incomingEmailRepository.save(email);
  }

  async updateIncomingEmailProcessingStatus(
    id: string,
    status: EmailProcessingStatus,
    incrementAttempts: boolean = false,
  ) {
    const email = await this.incomingEmailRepository.findOne({
      where: { id },
    });

    if (!email) {
      throw new NotFoundException(`Incoming email with id ${id} not found`);
    }

    email.processingStatus = status;
    email.processedAt = Date.now();

    if (incrementAttempts) {
      email.processingAttempts = (email.processingAttempts || 0) + 1;
    }

    if (status === EmailProcessingStatus.COMPLETED) {
      email.isProcessed = true;
    }

    return await this.incomingEmailRepository.save(email);
  }

  async findFailedEmailsForRetry(retryAfterMinutes: number = 5) {
    const retryThreshold = Date.now() - retryAfterMinutes * 60 * 1000;

    return await this.incomingEmailRepository
      .createQueryBuilder('email')
      .where('email.processingStatus = :status', {
        status: EmailProcessingStatus.FAILED,
      })
      .andWhere('email.processingAttempts < :maxAttempts', { maxAttempts: 2 })
      .andWhere('email.processedAt < :threshold', { threshold: retryThreshold })
      .getMany();
  }

  async updateIncomingEmailUnsubscribed(id: string, unsubscribed: boolean) {
    const email = await this.incomingEmailRepository.findOne({
      where: { id },
    });

    if (!email) {
      throw new NotFoundException(`Incoming email with id ${id} not found`);
    }

    email.unsubscribed = unsubscribed;
    if (unsubscribed) {
      email.unsubscribeStatus = UnsubscribeStatus.COMPLETED;
    }

    return await this.incomingEmailRepository.save(email);
  }

  async updateIncomingEmailUnsubscribeStatus(
    id: string,
    status: UnsubscribeStatus,
  ) {
    const email = await this.incomingEmailRepository.findOne({
      where: { id },
    });

    if (!email) {
      throw new NotFoundException(`Incoming email with id ${id} not found`);
    }

    email.unsubscribeStatus = status;
    if (status === UnsubscribeStatus.COMPLETED) {
      email.unsubscribed = true;
    }

    return await this.incomingEmailRepository.save(email);
  }

  async incrementUserEmailCount(userId: string): Promise<{
    emailCount: number;
    isLimitReached: boolean;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    user.emailCount = (user.emailCount || 0) + 1;

    if (user.emailCount >= EMAIL_LIMIT_PER_CREDENTIAL) {
      user.isLimitReached = true;
    }

    await this.userRepository.save(user);

    return {
      emailCount: user.emailCount,
      isLimitReached: user.isLimitReached,
    };
  }

  async checkUserEmailLimit(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return true; // Treat as limit reached if user not found
    }

    return user.isLimitReached;
  }

  async getUserEmailStatus(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    return {
      userId: user.id,
      email: user.email,
      emailCount: user.emailCount,
      emailLimit: EMAIL_LIMIT_PER_CREDENTIAL,
      isLimitReached: user.isLimitReached,
    };
  }

  async bulkDeleteEmails(ids: string[], userId: string) {
    if (!ids || ids.length === 0) {
      return { deleted: 0, queued: 0 };
    }

    // Get emails with their credentials and messageIds before deleting
    const emails = await this.incomingEmailRepository.find({
      where: ids.map((id) => ({ id, credential: { user: { id: userId } } })),
      relations: ['credential'],
    });

    // Queue Gmail deletion for each email (async)
    let queued = 0;
    for (const email of emails) {
      if (email.messageId && email.credential) {
        await this.queuePublisher.publish(Events.DELETE_GMAIL_MESSAGE, {
          messageId: email.messageId,
          credentialId: email.credential.id,
        });
        queued++;
      }
    }

    // Delete from database
    const result = await this.incomingEmailRepository
      .createQueryBuilder()
      .delete()
      .whereInIds(ids)
      .execute();

    return {
      deleted: result.affected || 0,
      queued,
    };
  }

  async bulkUnsubscribeEmails(ids: string[], userId: string) {
    if (!ids || ids.length === 0) {
      return { updated: 0, queued: 0 };
    }

    // Get emails with their credential info
    const emails = await this.incomingEmailRepository.find({
      where: ids.map((id) => ({ id, credential: { user: { id: userId } } })),
      relations: ['credential'],
    });

    // Filter emails that have unsubscribe capability and aren't already unsubscribed or processing
    const unsubscribableEmails = emails.filter(
      (e) =>
        e.hasUnsubscribe &&
        !e.unsubscribed &&
        e.unsubscribeStatus !== UnsubscribeStatus.PENDING &&
        e.unsubscribeStatus !== UnsubscribeStatus.PROCESSING,
    );

    if (unsubscribableEmails.length === 0) {
      return { updated: 0, queued: 0 };
    }

    // Set status to pending and queue unsubscribe action for each email
    let queued = 0;
    for (const email of unsubscribableEmails) {
      email.unsubscribeStatus = UnsubscribeStatus.PENDING;
      await this.incomingEmailRepository.save(email);

      await this.queuePublisher.publish(Events.UNSUBSCRIBE_EMAIL, {
        emailId: email.id,
      });
      queued++;
    }

    return {
      updated: unsubscribableEmails.length,
      queued,
    };
  }

  async deleteCredentialAndEmails(credentialId: string, userId: string) {
    // Find the credential and verify it belongs to the user
    const credential = await this.credentialRepository.findOne({
      where: { id: credentialId, user: { id: userId } },
      relations: ['user'],
    });

    if (!credential) {
      throw new NotFoundException(
        `Credential with id ${credentialId} not found`,
      );
    }

    // Delete all incoming emails associated with this credential
    const deleteEmailsResult = await this.incomingEmailRepository
      .createQueryBuilder()
      .delete()
      .where('credential.id = :credentialId', { credentialId })
      .execute();

    // Delete the credential
    await this.credentialRepository.remove(credential);

    return {
      deleted: true,
      emailsDeleted: deleteEmailsResult.affected || 0,
      inboxEmail: credential.inboxEmail,
    };
  }
}
