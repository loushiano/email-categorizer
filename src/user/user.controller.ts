import { UserService } from './user.service';
import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Res,
  Response,
} from '@nestjs/common';
import { Public } from '../authentication/constants';
import { formatResponse } from '../utils/helper-util';
import { UserDTO } from './user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  private readonly logger = new Logger(UsersController.name);
}
