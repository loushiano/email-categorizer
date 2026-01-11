import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_email_categories')
export class UserEmailCategory {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => User, (user) => user.emailCategories)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;
}
