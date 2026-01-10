import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { ConverstionDTO } from './conversion.dto';
@Controller('jumpapp')
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Post('conversions')
  createConversion(@Res() res, @Body() body: ConverstionDTO) {
    this.appService.saveConversion(body, res);
  }
  @Get('conversions')
  getConversions(@Res() res, @Query('sessionId') sessionId: string) {
    this.appService.getEntities(res, sessionId);
  }
}
