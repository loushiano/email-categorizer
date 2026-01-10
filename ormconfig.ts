import { ConfigModule } from '@nestjs/config';
import dbConfiguration from './src/db/database';

ConfigModule.forRoot({
  isGlobal: true,
  load: [dbConfiguration],
});

export default dbConfiguration();
