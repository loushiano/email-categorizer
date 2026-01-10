import { Logger, LogLevel, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'source-map-support/register';

async function bootstrap() {
  const logLevel: LogLevel[] =
    process.env.DEBUG == 'true'
      ? ['error', 'warn', 'log', 'debug']
      : ['error', 'warn', 'log'];

  const logger = new Logger('Main');
  const app = await NestFactory.create(AppModule, {
    logger: 'development' == process.env.NODE_ENV ? new Logger() : console,
    cors: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(8085);
  logger.log('okay we are live');
}
bootstrap();
