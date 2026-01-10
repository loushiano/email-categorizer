import { AutoMap } from '@automapper/classes';
import { UserStatus } from '../utils/constants';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserCredential } from './userCredendtial.entity';

@Entity('users')
export class User {
  @PrimaryColumn()
  id: string;

  @AutoMap()
  @Column({ name: 'fname' })
  fname: string;

  @AutoMap()
  @Column({ name: 'lname' })
  lname: string;

  @AutoMap()
  @Column({ name: 'email', unique: true })
  email: string;

  @Column({ name: 'password' })
  password: string;

  @Column({ name: 'status', default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ name: 'inbox_access', default: false })
  inboxAccess: boolean;

  @Column()
  customer: string;

  @AutoMap()
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt: Date;

  @OneToOne((type) => UserCredential, (cred) => cred.user, { cascade: true })
  credential: UserCredential;
}
