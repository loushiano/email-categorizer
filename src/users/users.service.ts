import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable, Logger } from '@nestjs/common';
import { UserDTO } from './user.dto';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CreditCardDTO } from './card.dto';
import { Otp } from '../authentication/otp.entity';
import { ConfigService } from '@nestjs/config';
import { EventService } from 'src/events/event.service';
import { EVENTS } from 'src/events/events';
import StripeService from '../stripe/stripe.service';
import { Role, RoleService } from '../roles/role.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectMapper() private readonly classMapper: Mapper,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private roleService: RoleService,
    private stripeService: StripeService,
    private configService: ConfigService,
    private eventService: EventService,
  ) {}
  async register(user: UserDTO) {
    let entity = this.classMapper.map(user, UserDTO, User);
    entity.id = uuidv4();
    entity.role = await this.roleService.findRole(Role.USER);
    entity.allowPush = true;
    await this.userRepository.save(entity);
    //add event here

    return entity;
  }

  async allowPush(email: string, allow: boolean) {
    let user = await this.userRepository.findOne({ where: { email } });
    user.allowPush = allow;
    await this.userRepository.save(user);
    return await this.getProfile(email);
  }

  async verifyUser(email: string) {
    let user = await this.userRepository.findOne({ where: { email } });
    await this.userRepository.update(user.id, { verified: true });
  }

  async resetPassword(email: string, password: string) {
    let user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw 'Invalid email for user';
    }
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(password, salt);
    await this.userRepository.save(user);
  }

  async addImage(id: string, name: string) {
    await this.userRepository.update(id, {
      imageUrl: this.configService.get('SERVER_URL') + '/' + name,
    });
  }

  async deleteCard(existingUser: any, cardId: string) {
    let user = await this.userRepository.findOne({
      where: { email: existingUser.username },
    });
    let result = await this.userRepository.query(
      `select count(*) as count from request where creator_id ='${existingUser.id}' and state  in ('placed','accepted','ready_to_pick_up','picked')`,
    );

    let result2 = await this.userRepository.query(
      `select count(*) as count from subscription_request sr inner join request r on r.id = sr.request_id where creator_id ='${existingUser.id}' and sr.state  in ('placed','ready_to_pick_up','picked')`,
    );
    if (result[0].count > 0 || result2.count > 0) {
      throw Error(
        'Cannot delete your card while you have a request in progress',
      );
    }
    await this.stripeService.deleteCard(user.customer, cardId);
    return await this.getProfile(existingUser.username);
  }

  async updateInfo(email: string, payload: { fname: string; lname: string }) {
    let user = await this.userRepository.findOne({ where: { email } });
    user.fname = payload.fname;
    user.lname = payload.lname;
    await this.userRepository.save(user);
    return await this.getProfile(email);
  }

  async deleteUser(email: string) {
    let user = await this.userRepository.findOne({ where: { email } });
    let count = (
      await this.userRepository.query(
        `select count(*) as count from request where state in ('accepted','placed','picked','ready_to_pick_up') and creator_id = "${user.id}"`,
      )
    )[0].count;
    console.log(count);
    if (count > 0) {
      throw Error(
        'You cannot delete your account if you have an order in progress',
      );
    }
    const salt = await bcrypt.genSalt();
    user.email = await bcrypt.hash(user.email, salt);
    user.fname = '';
    user.lname = '';

    await this.stripeService.removeCustomer(user.customer);
    user.customer = '';
    await this.userRepository.save(user);
    //add event here
    return 'ok';
  }

  async addCardToStripeCustomer(email: string, card: CreditCardDTO) {
    let user = (await this.userRepository.find({ where: { email } }))[0];
    await this.stripeService.attach(user.customer, card);
    return await this.getProfile(email);
  }

  async checkUser(email: string, pass: string) {
    const user = await this.userRepository.findOne({
      where: { email},
    });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async getUserByEmail(email: string) {
    return await this.userRepository.findOne({
      where: { email },
      relations: ['locations'],
    });
  }

  async getProfile(email: string) {
    let user = await this.getUserByEmail(email);
    delete user.password;
    const userDto = await this.classMapper.map(user, User, UserDTO);
    userDto.cards = await this.stripeService.getCards(user.customer);

    return userDto;
  }

  async makeCardDefault(email: string, cardId: string) {
    await this.stripeService.makeCardDefault(
      (
        await this.userRepository.findOne({ where: { email } })
      ).customer,
      cardId,
    );
    return await this.getProfile(email);
  }
}
