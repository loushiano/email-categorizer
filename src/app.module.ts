import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import dbConfiguration from './db/database';
import { AppService } from './app.service';
import { MainEntity } from './main.entity';

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
    TypeOrmModule.forFeature([MainEntity]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
