import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_credentials')
export class UserCredential {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => User, (user) => user.credentials)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'inbox_email', type: 'varchar' })
  inboxEmail: string;

  @Column({ name: 'tokens', type: 'text' })
  tokens: string;

  @Column({ name: 'expiry_date', type: 'bigint' })
  expiryDate: number;

  @Column({ name: 'watcher_date', type: 'bigint' })
  watcherDate: number;

  @Column({ name: 'last_history_id', nullable: true })
  lastHistoryId: string;
}
