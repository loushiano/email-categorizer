import { ConfigModule } from '@nestjs/config';
import dbConfiguration from './src/db/db.module';

ConfigModule.forRoot({
  isGlobal: true,
  load: [dbConfiguration],
});

export default dbConfiguration();
