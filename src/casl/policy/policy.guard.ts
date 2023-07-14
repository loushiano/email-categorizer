import { ForbiddenError, RawRuleOf, subject } from "@casl/ability";
import { CanActivate, ExecutionContext, HttpException, Injectable, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionAction, PermissionSubject } from "../../permissions/entities/permission.entity";
import { AppAbility, CaslAbilityFactory } from "../casl-ability.factory";
import { CHECK_POLICIES_KEY } from "./check-policy.decorator";
import { PolicyHandler } from "./policy-handler.interface";

@Injectable()
export class PoliciesGuard implements CanActivate {
  private readonly logger = new Logger(PoliciesGuard.name)

  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers =
      this.reflector.get<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    
    const { user } = context.switchToHttp().getRequest()?.session;
    
    const ability = this.caslAbilityFactory.createForUser(this.alterPermissions(user));
    

    return policyHandlers.every((handler) =>
      this.execPolicyHandler(handler, ability),
    );
  }

  private  alterPermissions(user) {
      // Should always be able to view own platform & own information
    const teamMemberReadPermissions = user.role.permissions.filter(p => p.subject === PermissionSubject.TeamMember && p.action.includes(PermissionAction.read) && p.action.includes(PermissionAction.update));
    if (teamMemberReadPermissions.length === 0) {
      user.role.permissions = [{ subject: 'TeamMember', action: ['read', 'update'], conditions: { id: user.id } }].concat(user.role.permissions);
    }
    // same check for platforms
    const platformPermissions = user.role.permissions.filter(p => p.subject === PermissionSubject.Platform && p.action.includes(PermissionAction.read));
    if (platformPermissions.length === 0) {
      user.role.permissions = [{ subject: PermissionSubject.Platform, action: [PermissionAction.read], conditions: { id: user.platformid } }].concat(user.role.permissions);
    }

    return user
  }
  

  public  checkPermission(user, action, subj, object) {
    const ability = this.caslAbilityFactory.createForUser(this.alterPermissions(user));
    if (ability.can(action, subject(subj, object))) {
      return true;
    }
    else {
      this.logger.warn(`User ${user.id} tried to ${action} ${subj} ${object.id} but was not allowed`);
      throw new HttpException(`You do not have permission to perform ${action} on the resource:${subj}`, 401);
    }
  }
  private execPolicyHandler(handler: PolicyHandler, ability: AppAbility) {
    if (typeof handler === 'function') {
      return handler(ability);
    }
    return handler.handle(ability);
  }
}