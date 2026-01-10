import { InjectMapper } from '@automapper/nestjs';
import { Mapper } from '@automapper/core';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserDTO } from './user.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectMapper() private readonly classMapper: Mapper,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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

  async validateUser(email: string, password: string) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new BadRequestException('user not found');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new BadRequestException('invalid password');
    }
    return user;
  }

  async createUser(userdto: UserDTO) {
    userdto.email = userdto.email.toLowerCase();
    let user = await this.userRepository.findOne({
      where: { email: userdto.email },
    });

    if (!user) {
      user = this.classMapper.map(userdto, UserDTO, User);
      user.id = uuidv4();
      const salt = await bcrypt.genSalt();
      user.password = await bcrypt.hash(user.id, salt);
      user = await this.userRepository.save(user);
    }
    return { id: user.id };
  }

  async saveUser(user: User) {
    await this.userRepository.save(user);
  }
}
