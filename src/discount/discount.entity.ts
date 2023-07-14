import { AutoMap } from '@automapper/classes';
import { User } from 'src/users/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('discount')
export class Discount {
  @Column()
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @OneToOne((type) => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
  @Column({ name: 'discount' })
  discount: number;

  @Column({ name: 'percentage', default: 0 })
  percentage: number;

  @Column({ name: 'is_vendor', default: false })
  isVendor: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt: Date;
}
