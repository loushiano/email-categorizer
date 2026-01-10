import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  Res,
  Response,
  UseGuards,
} from '@nestjs/common';
import { formatResponse } from '../utils/helper-util';
import { GoogleSerivce } from './google.service';
import { Public } from '../authentication/constants';

@Controller('auth/google')
export class GoogleController {
  constructor(private readonly googleService: GoogleSerivce) {}

  private readonly logger = new Logger(GoogleController.name);
  @Public()
  @Get('url')
  async getUrl(@Res() res) {
    return formatResponse(
      this.logger,
      this.googleService.getGoogleAuth(),
      res,
      `getting auth url`,
    );
  }

  @Public()
  @Get('')
  async verifyCode(@Res() res, @Query('code') code: string) {
    await this.googleService.verifyCode(code);
    res.send(
      '<!DOCTYPE html><html lang="en"><head></head><body><script>window.close();</script></body></html>',
    );
  }

  @Public()
  @Post('decode')
  async decode(@Res() res, @Req() req, @Body() payload: any) {
    return formatResponse(
      this.logger,
      this.googleService.decode(payload),
      res,
      `getting auth url`,
    );
  }
}
