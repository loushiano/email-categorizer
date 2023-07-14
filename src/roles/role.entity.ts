import { AutoMap } from '@automapper/classes';
import { RawRuleOf } from '@casl/ability';
import { AppAbility } from '../casl/casl-ability.factory';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('role')
export class RoleEntity {
  @AutoMap()
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'json', name: 'permission' })
  permissions: RawRuleOf<AppAbility>[];

  @AutoMap()
  @Column({ name: 'name' })
  name: string;
}
