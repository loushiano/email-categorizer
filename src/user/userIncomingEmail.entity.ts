import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserCredential } from './userCredendtial.entity';
import { UserEmailCategory } from './userEmailCategory.entity';

@Entity('user_incoming_emails')
export class UserIncomingEmail {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => UserCredential, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'credential_id' })
  credential: UserCredential;

  @ManyToOne(() => UserEmailCategory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: UserEmailCategory;

  @Column({ name: 'from', type: 'varchar', length: 255 })
  from: string;

  @Column({ name: 'subject', type: 'varchar', length: 500, nullable: true })
  subject: string;

  @Column({ name: 'html_text', type: 'longtext', nullable: true })
  htmlText: string;

  @Column({ name: 'text', type: 'longtext', nullable: true })
  text: string;

  @Column({ name: 'message_id', type: 'varchar', length: 255 })
  messageId: string;

  @Column({ name: 'attachments', type: 'json', nullable: true })
  attachments: string[];

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary: string;

  @Column({ name: 'has_unsubscribe', type: 'boolean', default: false })
  hasUnsubscribe: boolean;

  @Column({ name: 'is_processed', type: 'boolean', default: false })
  isProcessed: boolean;

  @Column({ name: 'unsubscribed', type: 'boolean', default: false })
  unsubscribed: boolean;

  @Column({ name: 'creation_date', type: 'bigint' })
  creationDate: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt: Date;
}
