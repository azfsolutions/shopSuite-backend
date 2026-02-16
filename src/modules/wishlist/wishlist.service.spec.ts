import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';

describe('WishlistService', () => {
    let service: WishlistService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        // Add wishlist model mock since it's not in the base mock
        (prisma as any).wishlist = {
            findUnique: jest.fn(),
            create: jest.fn(),
            upsert: jest.fn(),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WishlistService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<WishlistService>(WishlistService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('getWishlist', () => {
        it('should upsert and return wishlist with items', async () => {
            const wishlist = {
                id: 'wl-1',
                customerId: 'cust-1',
                items: [{ id: 'wi-1', productId: 'prod-1', product: { name: 'Test' } }],
            };
            (prisma as any).wishlist.upsert.mockResolvedValue(wishlist);

            const result = await service.getWishlist('cust-1');
            expect(result.items).toHaveLength(1);
        });
    });

    describe('addItem', () => {
        it('should add product to wishlist', async () => {
            prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
            (prisma as any).wishlist.findUnique.mockResolvedValue({ id: 'wl-1' });
            prisma.wishlistItem.findUnique.mockResolvedValue(null);
            prisma.wishlistItem.create.mockResolvedValue({ id: 'wi-1', productId: 'prod-1' });

            const result = await service.addItem('cust-1', 'prod-1');
            expect(result).toBeDefined();
        });

        it('should create wishlist if not exists then add item', async () => {
            prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
            (prisma as any).wishlist.findUnique.mockResolvedValue(null);
            (prisma as any).wishlist.create.mockResolvedValue({ id: 'wl-new' });
            prisma.wishlistItem.findUnique.mockResolvedValue(null);
            prisma.wishlistItem.create.mockResolvedValue({ id: 'wi-1' });

            const result = await service.addItem('cust-1', 'prod-1');
            expect(result).toBeDefined();
        });

        it('should throw ConflictException if already in wishlist', async () => {
            prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
            (prisma as any).wishlist.findUnique.mockResolvedValue({ id: 'wl-1' });
            prisma.wishlistItem.findUnique.mockResolvedValue({ id: 'existing' });

            await expect(service.addItem('cust-1', 'prod-1')).rejects.toThrow(ConflictException);
        });

        it('should throw NotFoundException if product does not exist', async () => {
            prisma.product.findUnique.mockResolvedValue(null);

            await expect(service.addItem('cust-1', 'nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('removeItem', () => {
        it('should remove product from wishlist', async () => {
            (prisma as any).wishlist.findUnique.mockResolvedValue({ id: 'wl-1' });
            prisma.wishlistItem.findUnique.mockResolvedValue({ id: 'wi-1' });
            prisma.wishlistItem.delete.mockResolvedValue({});

            const result = await service.removeItem('cust-1', 'prod-1');

            expect(result.message).toBe('Producto removido de la wishlist');
        });

        it('should throw NotFoundException if wishlist not found', async () => {
            (prisma as any).wishlist.findUnique.mockResolvedValue(null);

            await expect(service.removeItem('cust-1', 'prod-1')).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException if item not in wishlist', async () => {
            (prisma as any).wishlist.findUnique.mockResolvedValue({ id: 'wl-1' });
            prisma.wishlistItem.findUnique.mockResolvedValue(null);

            await expect(service.removeItem('cust-1', 'prod-1')).rejects.toThrow(NotFoundException);
        });
    });

    describe('isInWishlist', () => {
        it('should return true when item exists', async () => {
            (prisma as any).wishlist.findUnique.mockResolvedValue({ id: 'wl-1' });
            prisma.wishlistItem.findUnique.mockResolvedValue({ id: 'wi-1' });

            const result = await service.isInWishlist('cust-1', 'prod-1');
            expect(result).toBe(true);
        });

        it('should return false when wishlist not found', async () => {
            (prisma as any).wishlist.findUnique.mockResolvedValue(null);

            const result = await service.isInWishlist('cust-1', 'prod-1');
            expect(result).toBe(false);
        });

        it('should return false when item not in wishlist', async () => {
            (prisma as any).wishlist.findUnique.mockResolvedValue({ id: 'wl-1' });
            prisma.wishlistItem.findUnique.mockResolvedValue(null);

            const result = await service.isInWishlist('cust-1', 'prod-1');
            expect(result).toBe(false);
        });
    });

    describe('getWishlistCount', () => {
        it('should return count of wishlist items', async () => {
            (prisma as any).wishlist.findUnique.mockResolvedValue({
                _count: { items: 5 },
            });

            const count = await service.getWishlistCount('cust-1');
            expect(count).toBe(5);
        });

        it('should return 0 when wishlist not found', async () => {
            (prisma as any).wishlist.findUnique.mockResolvedValue(null);

            const count = await service.getWishlistCount('cust-1');
            expect(count).toBe(0);
        });
    });
});
