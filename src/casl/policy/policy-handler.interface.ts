import { AppAbility } from '../casl-ability.factory';

interface IPolicyHandler {
  handle(ability: AppAbility, service?: any): boolean;
}

type PolicyHandlerCallback = (ability: AppAbility) => boolean;

export type PolicyHandler = IPolicyHandler | PolicyHandlerCallback;