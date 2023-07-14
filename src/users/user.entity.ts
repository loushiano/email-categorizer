import { AutoMap } from '@automapper/classes';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserSettings } from './user-settings.entity';
import { RoleEntity } from '../roles/role.entity';

@Entity('user')
export class User {
  @AutoMap()
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

  @AutoMap()
  @Column({ name: 'password', nullable: true, default: null })
  password: string;

  @AutoMap()
  @OneToOne((type) => RoleEntity)
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @AutoMap()
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt: Date;

  @OneToOne((type) => UserSettings, { cascade: true })
  @JoinColumn({ name: 'user_setings_id' })
  settings: UserSettings;

  @Column({ name: 'customer_stripe', nullable: false })
  customer: string;

  @Column({ name: 'image_url', nullable: true, default: null })
  imageUrl: string;

  @AutoMap()
  @Column({ name: 'allow_push', default: false })
  allowPush: boolean;

  @AutoMap()
  @Column({ name: 'verified', default: false })
  verified: boolean;
}
