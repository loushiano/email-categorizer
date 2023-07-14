import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  return {
    type: 'mysql',
    logging: false,
    host: process.env.DB_HOST,
    port: parseInt('3306'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    autoLoadEntities: true,
    charset:'utf8mb4',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    cli: {
      migrationsDir: 'src/migrations',
    },
    migrationsTableName: 'migrations_history',
    timezone: 'Z',
  };
});