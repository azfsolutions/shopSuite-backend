import { SetMetadata } from '@nestjs/common';

export const GLOBAL_ROLE_KEY = 'globalRole';
export const RequireGlobalRole = (...roles: string[]) =>
    SetMetadata(GLOBAL_ROLE_KEY, roles);
