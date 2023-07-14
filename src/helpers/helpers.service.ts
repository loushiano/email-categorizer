import { Injectable, Logger } from '@nestjs/common';
import { AppResponse } from 'src/app-type';

@Injectable()
export class HelpersService {
  async formatResponse(
    logger: Logger,
    dataPromise: Promise<any>,
    response: any,
    endpoint: string,
  ): Promise<AppResponse> {
    logger.log(`executing ${endpoint}`);
    try {
      const data = await dataPromise;
      response.status(200).send({
        data,
      });

      logger.log(`returning successful result for ${endpoint}`);
    } catch (error) {
      logger.error(error);
      response.status(400).send(
        JSON.stringify({
          message: error?.message,
        }),
      );
      return;
    }
  }

  isNumber(value: string) {
    return !Number.isNaN(+value);
  }

  capitalizeFirstLetter(word: string) {
    return word.charAt(0).toUpperCase() + word.substring(1);
  }
}
