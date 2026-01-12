import { UserService } from './user.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  Request,
  Res,
} from '@nestjs/common';
import { formatResponse } from '../utils/helper-util';
import {
  CreateUserEmailCategoryDto,
  UpdateUserEmailCategoryDto,
} from './userEmailCategory.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  private readonly logger = new Logger(UsersController.name);

  // Get current user's credentials (connected inboxes)
  @Get('credentials')
  async getMyCredentials(@Res() res, @Req() req) {
    return formatResponse(
      this.logger,
      this.userService.findCredentialsByUserId(req.user.id),
      res,
      'getting user credentials',
    );
  }

  // Get user email status (email count, limit info)
  @Get('email-status')
  async getUserEmailStatus(@Res() res, @Req() req) {
    return formatResponse(
      this.logger,
      this.userService.getUserEmailStatus(req.user.id),
      res,
      'getting user email status',
    );
  }

  // Get incoming emails by category id
  @Get('incoming-emails/category/:categoryId')
  async getIncomingEmailsByCategory(
    @Res() res,
    @Param('categoryId') categoryId: string,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.userService.findIncomingEmailsByCategoryId(categoryId, req.user.id),
      res,
      'getting incoming emails by category',
    );
  }

  // Get uncategorized emails for a credential
  @Get('incoming-emails/uncategorized')
  async getUncategorizedEmails(@Res() res, @Req() req) {
    return formatResponse(
      this.logger,
      this.userService.findUncategorizedEmailsByUserId(req.user.id),
      res,
      'getting uncategorized emails',
    );
  }

  // Bulk delete emails (from DB, async delete from Gmail via queue)
  @Post('incoming-emails/bulk-delete')
  async bulkDeleteEmails(
    @Res() res,
    @Body() body: { ids: string[] },
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.userService.bulkDeleteEmails(body.ids, req.user.id),
      res,
      'bulk deleting emails',
    );
  }

  // Bulk unsubscribe from emails
  @Post('incoming-emails/bulk-unsubscribe')
  async bulkUnsubscribeEmails(
    @Res() res,
    @Body() body: { ids: string[] },
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.userService.bulkUnsubscribeEmails(body.ids, req.user.id),
      res,
      'bulk unsubscribing from emails',
    );
  }

  // Get all incoming emails for current user
  @Get('incoming-emails')
  async getAllMyIncomingEmails(@Res() res, @Req() req) {
    return formatResponse(
      this.logger,
      this.userService.findAllIncomingEmailsByUserId(req.user.id),
      res,
      'getting all incoming emails for user',
    );
  }

  // Get single incoming email by id
  @Get('incoming-emails/:id')
  async getIncomingEmail(@Res() res, @Param('id') id: string) {
    return formatResponse(
      this.logger,
      this.userService.findIncomingEmailById(id, ['credential']),
      res,
      'getting incoming email',
    );
  }

  // Email Category CRUD endpoints
  @Post('email-categories')
  async createEmailCategory(
    @Res() res,
    @Req() req,
    @Body() dto: CreateUserEmailCategoryDto,
  ) {
    return formatResponse(
      this.logger,
      this.userService.createEmailCategory(req.user.id, dto),
      res,
      'creating email category',
    );
  }

  @Get('email-categories')
  async getMyEmailCategories(@Res() res, @Req() req) {
    return formatResponse(
      this.logger,
      this.userService.findAllEmailCategoriesByUserId(req.user.id),
      res,
      'getting email categories',
    );
  }

  @Get('email-categories/:id')
  async getEmailCategory(@Res() res, @Param('id') id: string) {
    return formatResponse(
      this.logger,
      this.userService.findEmailCategoryById(id),
      res,
      'getting email category',
    );
  }

  @Put('email-categories/:id')
  async updateEmailCategory(
    @Res() res,
    @Param('id') id: string,
    @Body() dto: UpdateUserEmailCategoryDto,
  ) {
    return formatResponse(
      this.logger,
      this.userService.updateEmailCategory(id, dto),
      res,
      'updating email category',
    );
  }

  @Delete('email-categories/:id')
  async deleteEmailCategory(@Res() res, @Param('id') id: string) {
    return formatResponse(
      this.logger,
      this.userService.deleteEmailCategory(id),
      res,
      'deleting email category',
    );
  }
}
