import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelpersModule } from '../helpers/helpers.module';
import { Discount } from './discount.entity';
import { DiscountService } from './discount.service';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [TypeOrmModule.forFeature([Discount]), HelpersModule, SocketModule],
  providers: [DiscountService],
  exports: [DiscountService],
})
export class DiscountModule {}
