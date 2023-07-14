import {
  Body,
  Controller,
  Logger,
  Post,
  Request,
  Response,
} from '@nestjs/common';
import { HelpersService } from 'src/helpers/helpers.service';
import { EventService } from './event.service';

@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);
  constructor(
    private readonly helperService: HelpersService,
    private eventService: EventService,
  ) {}

  @Post('add')
  async addEventV2(
    @Request() req,
    @Response() res,
    @Body()
    payload: { data: any; name: string },
  ) {
    this.eventService.addEvent({
      userId: req.user.id,
      name: payload.name,
      data: payload.data,
    });
    return this.helperService.formatResponse(
      this.logger,
      this.empty(),
      res,
      `adding event ${payload.name} from user ${req.user.id} with data ${payload.data}`,
    );
  }

  async empty() {
    return 'done';
  }
}
