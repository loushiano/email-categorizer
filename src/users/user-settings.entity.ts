import { AutoMap } from '@automapper/classes';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_settings')
export class UserSettings {
  @AutoMap()
  @PrimaryGeneratedColumn()
  id: number;

  @AutoMap()
  @Column({name:"push_enabled",default:false})
  pushEnabled: boolean;

  @AutoMap()
  @Column({name:"updated_enabled",default:false})
  updateEnabled: boolean;


}
