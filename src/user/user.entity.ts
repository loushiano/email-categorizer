import { UserStatus } from '../utils/constants';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserCredential } from './userCredendtial.entity';
import { UserEmailCategory } from './userEmailCategory.entity';

@Entity('users')
export class User {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'fname' })
  fname: string;

  @Column({ name: 'lname' })
  lname: string;

  @Column({ name: 'email', unique: true })
  email: string;

  @Column({ name: 'status', default: UserStatus.VALID })
  status: UserStatus;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt: Date;

  @OneToMany((type) => UserCredential, (cred) => cred.user, { cascade: true })
  credentials: UserCredential[];

  @OneToMany(() => UserEmailCategory, (category) => category.user, {
    cascade: true,
  })
  emailCategories: UserEmailCategory[];
}
