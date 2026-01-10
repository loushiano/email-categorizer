import { AutoMap } from '@automapper/classes';

export class UserDTO {
  @AutoMap()
  id: string;
  @AutoMap()
  fname: string;
  @AutoMap()
  lname: string;
  @AutoMap()
  email: string;
}
