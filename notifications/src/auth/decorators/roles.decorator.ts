import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restreint une route aux utilisateurs dont le rôle SSO figure dans la liste. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
