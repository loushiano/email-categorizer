import { Injectable, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MainEntity } from './main.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { ConverstionDTO } from './conversion.dto';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MainEntity)
    private readonly mainEntityRepo: Repository<MainEntity>,
  ) {}

  async getEntities(@Res() res: Response, sessionId: string) {
    const results = await this.mainEntityRepo.find({ where: { sessionId } });
    res.status(200).send(results);
  }

  async saveConversion(conversion: ConverstionDTO, @Res() res: Response) {
    const newConversion = new MainEntity();
    newConversion.amount = conversion.amount;
    newConversion.conversion = conversion.conversion;
    newConversion.rate = conversion.rate;
    newConversion.targetCurrency = conversion.targetCurrency;
    newConversion.sessionId = conversion.sessionId;
    console.log(conversion);
    await this.mainEntityRepo.save(newConversion);
    res.status(201).send();
  }
}
