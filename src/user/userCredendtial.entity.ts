import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_credentials')
export class UserCredential {
  @PrimaryColumn()
  id: string;

  @OneToOne((type) => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @AutoMap()
  @Column({ name: 'tokens', type: 'text' })
  tokens: string;

  @AutoMap()
  @Column({ name: 'expiry_date', type: 'bigint' })
  expiryDate: number;

  @AutoMap()
  @Column({ name: 'watcher_date', type: 'bigint' })
  watcherDate: number;

  @Column({ name: 'last_history_id', nullable: true })
  lastHistoryId: string;
}
