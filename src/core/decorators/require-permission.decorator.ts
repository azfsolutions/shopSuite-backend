import { SetMetadata } from '@nestjs/common';
import { Permission } from '../../config/permissions.config';

export const PERMISSION_KEY = 'required_permission';

/**
 * Decorador para proteger endpoints con permisos específicos
 * @example @RequirePermission(PERMISSIONS.PRODUCTS_DELETE)
 */
export const RequirePermission = (permission: Permission) =>
    SetMetadata(PERMISSION_KEY, permission);
