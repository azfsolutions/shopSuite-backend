import { SetMetadata } from '@nestjs/common';
import { StoreRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: StoreRole[]) => SetMetadata(ROLES_KEY, roles);
