import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Post,
  Put,
  Query,
  Request,
  Response,
} from '@nestjs/common';
import { Public } from 'src/authentication/constants';
import { HelpersService } from 'src/helpers/helpers.service';
import { CreditCardDTO } from './card.dto';
import { UserDTO } from './user.dto';
import { UsersService } from './users.service';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(
    private readonly userService: UsersService,
    private readonly appService: HelpersService,
  ) {}

  @Get('')
  async getUser(@Request() req, @Response() res) {
    return this.appService.formatResponse(
      this.logger,
      this.userService.getProfile(req.user.username),
      res,
      `getting profile for ${req.user.id}`,
    );
  }

  @Put('cards/default')
  async makeCardDefault(
    @Request() req,
    @Response() res,
    @Body() payload: { cardId: string },
  ) {
    return this.appService.formatResponse(
      this.logger,
      this.userService.makeCardDefault(req.user.username, payload.cardId),
      res,
      `card making default for user ${req.user.id} and id ${payload.cardId}`,
    );
  }

  @Put('info/update')
  async updateInfo(
    @Request() req,
    @Response() res,
    @Body() payload: { fname: string; lname: string },
  ) {
    return this.appService.formatResponse(
      this.logger,
      this.userService.updateInfo(req.user.username, payload),
      res,
      `update user ${req.user.id} with fname ${payload.fname} and lname ${payload.lname}`,
    );
  }

  @Delete('delete')
  async deleteUser(@Request() req, @Response() res) {
    return this.appService.formatResponse(
      this.logger,
      this.userService.deleteUser(req.user.username),
      res,
      `deleting user ${req.user.id} `,
    );
  }

  @Post('add/card')
  async addCard(
    @Body() payload: CreditCardDTO,
    @Request() req,
    @Response() res,
  ) {
    return this.appService.formatResponse(
      this.logger,
      this.userService.addCardToStripeCustomer(req.user.username, payload),
      res,
      `adding card for user ${req.user.id}`,
    );
  }

  @Delete('delete/card/:cardId')
  async deleteCard(@Request() req, @Response() res) {
    return this.appService.formatResponse(
      this.logger,
      this.userService.deleteCard(req.user, req.params.cardId),
      res,
      `deleting card for user ${req.user.id}`,
    );
  }

  @Put('allowPush')
  async allowPush(
    @Request() req,
    @Response() res,
    @Body() payload: { allow: boolean },
  ) {
    return this.appService.formatResponse(
      this.logger,
      this.userService.allowPush(req.user.username, payload.allow),
      res,
      `deleting card for user ${req.user.id}`,
    );
  }
}
