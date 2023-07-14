import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Post,
  Put,
  Request,
  Response,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { HelpersService } from '../helpers/helpers.service';
import { RoleDto } from './role.dto';
import { Logging } from 'src/decorators/logging';

@Controller('role')
export class RoleController {
  private readonly logger = new Logger(RoleController.name);
  constructor(
    private readonly roleService: RoleService,
    private readonly appService: HelpersService,
  ) {}

  @Post('')
  async createRole(@Body() role: RoleDto, @Request() req, @Response() res) {}

  @Put(':id')
  async editRole(@Body() role: RoleDto) {}

  @Delete(':id')
  async deleteRole(@Request() req, @Response() res) {}

  @Get(':id')
  async getRole(@Request() req, @Response() res) {}

  @Get('')
  async getRoles(@Request() req, @Response() res) {
    return this.appService.formatResponse(
      this.logger,
      this.roleService.getRoles(),
      res,
      `getting roles for user ${req.user.id}`,
    );
  }
}
