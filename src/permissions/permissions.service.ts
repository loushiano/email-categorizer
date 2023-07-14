import { Injectable } from '@nestjs/common';
import { Permission, PermissionAction, PermissionSubject } from './permissions';

@Injectable()
export class PermissionsService {
  allActions = [
    PermissionAction.manage,
    PermissionAction.read,
    PermissionAction.delete,
    PermissionAction.create,
    PermissionAction.update,
  ];
  permissions: Permission[] = [
    {
      subject: PermissionSubject.all,
      actions: this.allActions,
    },
    {
      subject: PermissionSubject.user,
      actions: this.allActions,
    },
  ];

  findAll() {
    return this.permissions;
  }
}
