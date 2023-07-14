export class Permission {
  subject: PermissionSubject;
  actions: PermissionAction[];
  aliases?: { [key: string]: string | {} };
  constructor(
    subject: PermissionSubject,
    actions: PermissionAction[],
    aliases?: { [key: string]: string },
  ) {
    this.subject = subject;
    this.actions = actions;
    this.aliases = aliases || {};
  }
}

export enum PermissionAction {
  manage = 'Manage',
  read = 'Read',
  delete = 'Delete',
  create = 'Create',
  update = 'Update',
}

export enum PermissionSubject {
  all = 'All',
  user = 'User',
  role = 'Role',
}
