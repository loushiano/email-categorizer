import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestEntity } from '../request/request.entity';
import { Repository } from 'typeorm';
import { Discount } from './discount.entity';
import { User } from 'src/users/user.entity';
import { NotificationsService } from 'src/socket/firebase';

@Injectable()
export class DiscountService {
  private readonly logger = new Logger(DiscountService.name);
  constructor(
    @InjectRepository(Discount)
    private discountRepo: Repository<Discount>,
    private notificationService: NotificationsService,
  ) {}
  async handleDiscount(
    entity: RequestEntity,
    userId: string,
    toDelete: boolean,
  ) {
    let discount = await this.discountRepo.findOne({
      where: { user: { id: userId }, isVendor: false },
    });
    if (discount) {
      entity.discount = discount.discount;
      console.log(entity.total);
      if (entity.discount > entity.total) {
        entity.discount = entity.total;
      }
      if (toDelete) {
        this.logger.log(`Deleting discount for ${userId}`);
        if (discount.discount > entity.total) {
          await this.discountRepo.update(discount.id, {
            discount: discount.discount - entity.total,
          });
        } else {
          await this.discountRepo.remove(discount);
        }
      }
    } else {
      entity.discount = 0;
    }
  }

  async addDiscount(phone: string, discount: number) {
    let userInfo = (
      await this.discountRepo.query(
        `Select id,firebase_token as token, fname from user where phone = "${phone}"`,
      )
    )[0];
    let userId = userInfo.id;
    let dis = await this.discountRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!dis) {
      dis = new Discount();
      dis.discount = 0;
    }
    dis.email = '';
    dis.user = { id: userId } as User;
    dis.discount = +dis.discount + +discount;
    await this.discountRepo.save(dis);
    await this.notificationService.sendToUser(
      userInfo.token,
      '',
      `Dont Miss Out on A $${discount} Discount`,
      `Salam @@fname@@! Enjoy a $${discount} discount on your next purchase as a token of our appreciation`.replace(
        '@@fname@@',
        userInfo.fname,
      ),
    );
  }
}
