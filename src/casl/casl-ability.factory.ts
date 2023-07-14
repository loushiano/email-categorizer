import {
  MongoAbility,
  ForcedSubject,
  RawRuleOf,
  createMongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { User } from '../users/user.entity';
import {
  PermissionAction,
  PermissionSubject,
} from '../permissions/permissions';

const actions = Object.values(PermissionAction);
const subjects = Object.values(PermissionSubject);
type Abilities = [
  typeof actions[number],

  (
    | typeof subjects[number]
    | ForcedSubject<Exclude<typeof subjects[number], 'all'>>
  ),
];
export type AppAbility = MongoAbility<Abilities>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User) {
    const createAbility = (rules: RawRuleOf<AppAbility>[]) =>
      createMongoAbility<Abilities>(rules);
    return createAbility(user.role.permissions);
  }
}
