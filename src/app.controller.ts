import { Controller, Get } from '@nestjs/common';
import { AppResponse } from './app-type';
import { Public } from './authentication/constants';

@Controller('service')
export class AppController {
  @Public()
  @Get('healthcheck')
  getHello(): AppResponse {
    return { status: 200 };
  }
}
