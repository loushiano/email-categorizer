import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { UsersService } from 'src/users/users.service';
import { UserDTO } from 'src/users/user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Otp } from './otp.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    return this.userService.checkUser(username, pass);
  }

  async login(user: User) {
    const payload = { username: user.email, role: user.role, id: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(user: UserDTO) {
    await this.userService.register(user);
    await this.createCode(user.email);
  }

  async verify(email: string, code: string) {
    let otp = await this.verifyCode(email, code);
    await this.userService.verifyUser(email);
    await this.deleteCode(otp);
  }

  async verifyCode(email: string, code: string) {
    let otp = await this.otpRepository.findOne({
      where: { email, code },
    });
    if (!otp || +otp.created + 300000 < new Date().valueOf()) {
      throw Error('Invalid validation code!');
    }
    return otp;
  }
  async deleteCode(otp: Otp) {
    await this.otpRepository.delete(otp);
  }

  async createCode(email: string) {
    let otp = await this.otpRepository.findOne({ where: { email } });
    if (!otp) {
      otp = new Otp();
    }
    otp.created = new Date().valueOf();
    otp.code = `${Math.floor(Math.random() * 900000) + 100000}`;
    otp.email = email;
    this.otpRepository.save(otp);
  }

  async createCodeForReset(email: string) {
    let user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw Error('invalid user email');
    }
    await this.createCode(email);
  }

  async resetPassword(email: string, code: string, password: string) {
    let otp = await this.verifyCode(email, code);
    await this.userService.resetPassword(email, password);
    await this.deleteCode(otp);
  }
}
