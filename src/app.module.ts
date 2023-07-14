import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './authentication/auth.module';
import { JwtAuthGuard } from './authentication/jwt-auth.gard';
import { UsersModule } from './users/users.module';
import dbConfiguration from './db/db.module';
import { AutomapperModule } from '@automapper/nestjs';
import { classes } from '@automapper/classes';
import { RolesGuard } from './authentication/role.guard';
import { HelpersModule } from './helpers/helpers.module';
import { RequestModule } from './request/request.module';
import { StripeModule } from './stripe/stripe.module';
import { SocketModule } from './socket/socket.module';
import { LocationsModule } from './locations/locations.module';
import { FilesModule } from './files/files.module';
import { EmailsModule } from './emails/emails.module';
import { PhonesModule } from './phones/phones.module';
import { DiscountModule } from './discount/discount.module';
import { EventsModule } from './events/events.module';
import { PaymentModule } from './payment/payment.module';
import { PostModule } from './posts/post.module';
import { ChatModule } from './chat/chat.module';
import { ProductModule } from './product/product.module';
import { TestingModule } from './testing/testing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.override', '.env', '.env.aws'],
      load: [dbConfiguration],
    }), // .env.override takes priority when duplicates exist
    TypeOrmModule.forRootAsync({
      // TODO: Take out to ormconfig.js or config file
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
      inject: [ConfigService],
    }),
    AutomapperModule.forRoot({
      strategyInitializer: classes(),
    }),
    AuthModule,
    UsersModule,
    HelpersModule,
    RequestModule,
    StripeModule,
    SocketModule,
    LocationsModule,
    EventsModule,
    FilesModule,
    EmailsModule,
    PhonesModule,
    DiscountModule,
    PaymentModule,
    PostModule,
    ChatModule,
    ProductModule,
    TestingModule
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
