/**
 * Prisma Mock Factory
 * Creates a deep mock of PrismaService for unit testing.
 * Each model's methods return jest.fn() by default.
 */

type MockModel = {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    createMany: jest.Mock;
    createManyAndReturn: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
    count: jest.Mock;
    aggregate: jest.Mock;
    groupBy: jest.Mock;
    upsert: jest.Mock;
};

function createMockModel(): MockModel {
    return {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        createManyAndReturn: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
        upsert: jest.fn(),
    };
}

export type MockPrismaService = {
    [key: string]: MockModel | jest.Mock;
    product: MockModel;
    productImage: MockModel;
    category: MockModel;
    store: MockModel;
    storeMember: MockModel;
    order: MockModel;
    orderItem: MockModel;
    customer: MockModel;
    storeCustomerProfile: MockModel;
    user: MockModel;
    coupon: MockModel;
    shippingMethod: MockModel;
    review: MockModel;
    wishlistItem: MockModel;
    banner: MockModel;
    storefrontSettings: MockModel;
    newsletter: MockModel;
    testimonial: MockModel;
    benefit: MockModel;
    flashSale: MockModel;
    flashSaleProduct: MockModel;
    productVariant: MockModel;
    productOption: MockModel;
    productOptionValue: MockModel;
    auditLog: MockModel;
    notification: MockModel;
    subscription: MockModel;
    buyerAddress: MockModel;
    address: MockModel;
    buyerUser: MockModel;
    session: MockModel;
    account: MockModel;
    $transaction: jest.Mock;
    $connect: jest.Mock;
    $disconnect: jest.Mock;
};

export function createMockPrismaService(): MockPrismaService {
    return {
        product: createMockModel(),
        productImage: createMockModel(),
        category: createMockModel(),
        store: createMockModel(),
        storeMember: createMockModel(),
        order: createMockModel(),
        orderItem: createMockModel(),
        customer: createMockModel(),
        storeCustomerProfile: createMockModel(),
        user: createMockModel(),
        coupon: createMockModel(),
        shippingMethod: createMockModel(),
        review: createMockModel(),
        wishlistItem: createMockModel(),
        banner: createMockModel(),
        storefrontSettings: createMockModel(),
        newsletter: createMockModel(),
        testimonial: createMockModel(),
        benefit: createMockModel(),
        flashSale: createMockModel(),
        flashSaleProduct: createMockModel(),
        productVariant: createMockModel(),
        productOption: createMockModel(),
        productOptionValue: createMockModel(),
        auditLog: createMockModel(),
        notification: createMockModel(),
        subscription: createMockModel(),
        buyerAddress: createMockModel(),
        address: createMockModel(),
        buyerUser: createMockModel(),
        session: createMockModel(),
        account: createMockModel(),
        $transaction: jest.fn((cb) => cb ? cb(createMockPrismaService()) : Promise.resolve()),
        $connect: jest.fn(),
        $disconnect: jest.fn(),
    };
}
