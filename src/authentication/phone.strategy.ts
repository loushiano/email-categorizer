import { Strategy } from 'passport-custom';
import { PassportStrategy } from '@nestjs/passport';
import { HttpException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class PhoneStrategy extends PassportStrategy(Strategy,'custom') {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(req): Promise<any> {
    let { phone, code } = req.body;
    const user = await this.authService.validateNumReq(phone, code);
    if (!user) {
      throw new HttpException("Invalid Code! please try again or request a code resend",401);
    }
    return user;
  }
}
