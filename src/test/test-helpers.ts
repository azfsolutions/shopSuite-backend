/**
 * Test Helpers — Factory functions for test data
 */

export function createMockStore(overrides: Record<string, any> = {}) {
    return {
        id: 'store-1',
        name: 'Test Store',
        slug: 'test-store',
        ownerId: 'user-1',
        logo: null,
        status: 'ACTIVE',
        deletedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    };
}

export function createMockProduct(overrides: Record<string, any> = {}) {
    return {
        id: 'prod-1',
        name: 'Test Product',
        slug: 'test-product',
        description: 'A test product',
        price: 99.99,
        compareAtPrice: null,
        sku: 'SKU-001',
        stock: 10,
        status: 'ACTIVE',
        isFeatured: false,
        isExclusive: false,
        storeId: 'store-1',
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Test Category', slug: 'test-category' },
        images: [],
        deletedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    };
}

export function createMockOrder(overrides: Record<string, any> = {}) {
    return {
        id: 'order-1',
        orderNumber: 'ORD-001',
        storeId: 'store-1',
        customerId: 'cust-1',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        subtotal: 100,
        total: 110,
        shippingCost: 10,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    };
}

export function createMockCategory(overrides: Record<string, any> = {}) {
    return {
        id: 'cat-1',
        name: 'Test Category',
        slug: 'test-category',
        description: null,
        storeId: 'store-1',
        parentId: null,
        position: 0,
        isActive: true,
        deletedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    };
}

export function createMockCoupon(overrides: Record<string, any> = {}) {
    return {
        id: 'coupon-1',
        code: 'SAVE10',
        type: 'PERCENTAGE',
        value: 10,
        storeId: 'store-1',
        minPurchaseAmount: null,
        maxDiscountAmount: null,
        usageLimit: null,
        usageLimitPerCustomer: null,
        usageCount: 0,
        startsAt: null,
        expiresAt: null,
        isActive: true,
        deletedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    };
}

export function createMockCustomer(overrides: Record<string, any> = {}) {
    return {
        id: 'cust-1',
        email: 'customer@test.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+595991234567',
        storeId: 'store-1',
        ordersCount: 0,
        totalSpent: 0,
        emailVerified: false,
        acceptsMarketing: false,
        notes: null,
        tags: [],
        lastOrderAt: null,
        deletedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    };
}

export function createMockUser(overrides: Record<string, any> = {}) {
    return {
        id: 'user-1',
        email: 'user@test.com',
        firstName: 'Test',
        lastName: 'User',
        avatar: null,
        globalRole: 'USER',
        emailVerified: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    };
}

export function createMockStoreCustomerProfile(overrides: Record<string, any> = {}) {
    return {
        id: 'profile-1',
        buyerUserId: 'buyer-1',
        storeId: 'store-1',
        ordersCount: 2,
        totalSpent: 25000,
        lastOrderAt: new Date('2024-06-15'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    };
}

export function createMockBuyerAddress(overrides: Record<string, any> = {}) {
    return {
        id: 'addr-1',
        profileId: 'profile-1',
        label: 'Casa',
        recipientName: 'Juan Pérez',
        phone: '+595991234567',
        street: 'Av. España 1234',
        city: 'Asunción',
        state: 'Central',
        postalCode: '1234',
        country: 'PY',
        isDefault: true,
        notes: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    };
}

export function createMockShippingMethod(overrides: Record<string, any> = {}) {
    return {
        id: 'ship-1',
        name: 'Standard',
        description: 'Standard shipping',
        price: 5000,
        freeAbove: 100000,
        minDays: 3,
        maxDays: 5,
        isActive: true,
        position: 0,
        storeId: 'store-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    };
}
