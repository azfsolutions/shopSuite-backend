import { StoreRole } from '@prisma/client';

/**
 * RBAC Permissions Configuration
 * Definición de permisos granulares para el sistema de control de acceso
 */
export const PERMISSIONS = {
    // === TIENDA ===
    STORE_MANAGE: 'store.manage',
    STORE_VIEW_SETTINGS: 'store.view_settings',

    // === EQUIPO ===
    TEAM_MANAGE: 'team.manage',
    TEAM_VIEW: 'team.view',

    // === PRODUCTOS ===
    PRODUCTS_VIEW: 'products.view',
    PRODUCTS_CREATE: 'products.create',
    PRODUCTS_EDIT: 'products.edit',
    PRODUCTS_DELETE: 'products.delete',

    // === CATEGORÍAS ===
    CATEGORIES_VIEW: 'categories.view',
    CATEGORIES_MANAGE: 'categories.manage',

    // === PEDIDOS ===
    ORDERS_VIEW: 'orders.view',
    ORDERS_EDIT: 'orders.edit',
    ORDERS_REFUND: 'orders.refund',
    ORDERS_CANCEL: 'orders.cancel',

    // === CLIENTES ===
    CUSTOMERS_VIEW: 'customers.view',
    CUSTOMERS_EDIT: 'customers.edit',
    CUSTOMERS_DELETE: 'customers.delete',

    // === CUPONES ===
    COUPONS_VIEW: 'coupons.view',
    COUPONS_MANAGE: 'coupons.manage',

    // === ENVÍOS ===
    SHIPPING_VIEW: 'shipping.view',
    SHIPPING_MANAGE: 'shipping.manage',

    // === ANALÍTICAS ===
    ANALYTICS_VIEW: 'analytics.view',
    ANALYTICS_EXPORT: 'analytics.export',

    // === FACTURACIÓN ===
    BILLING_VIEW: 'billing.view',
    BILLING_MANAGE: 'billing.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Matriz de permisos por rol
 * Define qué permisos tiene cada rol del sistema
 */
export const ROLE_PERMISSIONS: Record<StoreRole, Permission[]> = {
    OWNER: Object.values(PERMISSIONS), // Acceso total

    ADMIN: [
        PERMISSIONS.STORE_VIEW_SETTINGS,
        PERMISSIONS.TEAM_MANAGE,
        PERMISSIONS.TEAM_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.PRODUCTS_CREATE,
        PERMISSIONS.PRODUCTS_EDIT,
        PERMISSIONS.PRODUCTS_DELETE,
        PERMISSIONS.CATEGORIES_VIEW,
        PERMISSIONS.CATEGORIES_MANAGE,
        PERMISSIONS.ORDERS_VIEW,
        PERMISSIONS.ORDERS_EDIT,
        PERMISSIONS.ORDERS_REFUND,
        PERMISSIONS.ORDERS_CANCEL,
        PERMISSIONS.CUSTOMERS_VIEW,
        PERMISSIONS.CUSTOMERS_EDIT,
        PERMISSIONS.CUSTOMERS_DELETE,
        PERMISSIONS.COUPONS_VIEW,
        PERMISSIONS.COUPONS_MANAGE,
        PERMISSIONS.SHIPPING_VIEW,
        PERMISSIONS.SHIPPING_MANAGE,
        PERMISSIONS.ANALYTICS_VIEW,
        PERMISSIONS.ANALYTICS_EXPORT,
    ],

    MANAGER: [
        PERMISSIONS.TEAM_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.PRODUCTS_CREATE,
        PERMISSIONS.PRODUCTS_EDIT,
        PERMISSIONS.PRODUCTS_DELETE,
        PERMISSIONS.CATEGORIES_VIEW,
        PERMISSIONS.CATEGORIES_MANAGE,
        PERMISSIONS.ORDERS_VIEW,
        PERMISSIONS.ORDERS_EDIT,
        PERMISSIONS.ORDERS_REFUND,
        PERMISSIONS.ORDERS_CANCEL,
        PERMISSIONS.CUSTOMERS_VIEW,
        PERMISSIONS.CUSTOMERS_EDIT,
        PERMISSIONS.COUPONS_VIEW,
        PERMISSIONS.COUPONS_MANAGE,
        PERMISSIONS.SHIPPING_VIEW,
        PERMISSIONS.SHIPPING_MANAGE,
        PERMISSIONS.ANALYTICS_VIEW,
    ],

    EDITOR: [
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.PRODUCTS_CREATE,
        PERMISSIONS.PRODUCTS_EDIT,
        PERMISSIONS.PRODUCTS_DELETE,
        PERMISSIONS.CATEGORIES_VIEW,
        PERMISSIONS.CATEGORIES_MANAGE,
    ],

    SUPPORT: [
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.ORDERS_VIEW,
        PERMISSIONS.ORDERS_EDIT,
        PERMISSIONS.ORDERS_CANCEL,
        PERMISSIONS.CUSTOMERS_VIEW,
    ],

    VIEWER: [PERMISSIONS.PRODUCTS_VIEW],
};

/**
 * Verifica si un rol tiene un permiso específico
 */
export function hasPermission(role: StoreRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Obtiene todos los permisos de un rol
 */
export function getPermissionsForRole(role: StoreRole): Permission[] {
    return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Labels legibles para cada permiso (para UI)
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
    [PERMISSIONS.STORE_MANAGE]: 'Gestionar tienda',
    [PERMISSIONS.STORE_VIEW_SETTINGS]: 'Ver configuración',
    [PERMISSIONS.TEAM_MANAGE]: 'Gestionar equipo',
    [PERMISSIONS.TEAM_VIEW]: 'Ver equipo',
    [PERMISSIONS.PRODUCTS_VIEW]: 'Ver productos',
    [PERMISSIONS.PRODUCTS_CREATE]: 'Crear productos',
    [PERMISSIONS.PRODUCTS_EDIT]: 'Editar productos',
    [PERMISSIONS.PRODUCTS_DELETE]: 'Eliminar productos',
    [PERMISSIONS.CATEGORIES_VIEW]: 'Ver categorías',
    [PERMISSIONS.CATEGORIES_MANAGE]: 'Gestionar categorías',
    [PERMISSIONS.ORDERS_VIEW]: 'Ver pedidos',
    [PERMISSIONS.ORDERS_EDIT]: 'Editar pedidos',
    [PERMISSIONS.ORDERS_REFUND]: 'Reembolsar pedidos',
    [PERMISSIONS.ORDERS_CANCEL]: 'Cancelar pedidos',
    [PERMISSIONS.CUSTOMERS_VIEW]: 'Ver clientes',
    [PERMISSIONS.CUSTOMERS_EDIT]: 'Editar clientes',
    [PERMISSIONS.CUSTOMERS_DELETE]: 'Eliminar clientes',
    [PERMISSIONS.COUPONS_VIEW]: 'Ver cupones',
    [PERMISSIONS.COUPONS_MANAGE]: 'Gestionar cupones',
    [PERMISSIONS.SHIPPING_VIEW]: 'Ver envíos',
    [PERMISSIONS.SHIPPING_MANAGE]: 'Gestionar envíos',
    [PERMISSIONS.ANALYTICS_VIEW]: 'Ver analíticas',
    [PERMISSIONS.ANALYTICS_EXPORT]: 'Exportar analíticas',
    [PERMISSIONS.BILLING_VIEW]: 'Ver facturación',
    [PERMISSIONS.BILLING_MANAGE]: 'Gestionar facturación',
};
