import { Module } from '@nestjs/common';
import { FilesCommonModule } from 'src/common/file/file-common.module';
import { EmailService } from './emails.service';

@Module({
  imports: [FilesCommonModule],
  providers: [EmailService],
  exports: [EmailService,],
})
export class EmailsModule {}
