import { AutoMap } from '@automapper/classes';
import { CreditCardDTO } from './card.dto';

export class UserDTO {
  @AutoMap()
  id: string;

  @AutoMap()
  fname: string;

  @AutoMap()
  lname: string;

  @AutoMap()
  email: string;

  @AutoMap()
  password: string;

  cards: CreditCardDTO[];

  @AutoMap()
  imageUrl: string;

  @AutoMap()
  allowPush: boolean;
}
