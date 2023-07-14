import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { HelpersService } from 'src/helpers/helpers.service';
import { UserDTO } from 'src/users/user.dto';
import { AppResponse } from '../app-type';
import { AuthService } from './auth.service';
import { Public } from './constants';
import { LocalAuthGuard } from './local-auth.gard';
import { PhoneAuthGuard } from './phone-auth.gard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly appService: HelpersService,
  ) {}

  private readonly logger = new Logger(AuthController.name);
  @UseGuards(LocalAuthGuard)
  @Public()
  @Post('login')
  async login(@Request() req, @Response() res) {
    return this.appService.formatResponse(
      this.logger,
      this.authService.login(req.user),
      res,
      `user trying to login ${req.email}`,
    );
  }

  @Public()
  @Post('register')
  async register(@Body() user: UserDTO, @Response() res) {
    return this.appService.formatResponse(
      this.logger,
      this.authService.register(user),
      res,
      `new user registering with their email ${user.fname}`,
    );
  }

  @Public()
  @Post('email/verify')
  async verify(
    @Body() payload: { email: string; otp: string },
    @Response() res,
  ) {
    return this.appService.formatResponse(
      this.logger,
      this.authService.verify(payload.email, payload.otp),
      res,
      `verifying email`,
    );
  }

  @Post('password/request')
  @Public()
  async createReset(@Request() req, @Response() res, @Query() params) {
    return this.appService.formatResponse(
      this.logger,
      this.authService.createCodeForReset(params.email),
      res,
      `creating reset request for user ${params.email}`,
    );
  }

  @Post('password/reset')
  @Public()
  async resetPassword(
    @Request() req,
    @Response() res,
    @Body() paylod: { email: string; code: string; password: string },
  ) {
    return this.appService.formatResponse(
      this.logger,
      this.authService.resetPassword(
        paylod.email,
        paylod.code,
        paylod.password,
      ),
      res,
      `resetting password for user ${paylod.email}`,
    );
  }
}
