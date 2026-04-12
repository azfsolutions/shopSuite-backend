import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
    CreateOptionDto,
    UpdateOptionDto,
    AddOptionValueDto,
    CreateVariantDto,
    UpdateVariantDto,
    BulkUpdateVariantsDto,
    GenerateVariantsDto,
} from './dto';

const MAX_OPTIONS_PER_PRODUCT = 3;
const MAX_VARIANTS_PER_PRODUCT = 100;

@Injectable()
export class VariantsService {
    constructor(private readonly prisma: PrismaService) { }

    private storeAccessFilter(userId: string) {
        return {
            OR: [
                { ownerId: userId },
                { members: { some: { userId } } },
            ],
        };
    }

    private async assertProductAccess(userId: string, productId: string) {
        const product = await this.prisma.product.findFirst({
            where: {
                id: productId,
                store: this.storeAccessFilter(userId),
            },
            select: { id: true, storeId: true },
        });
        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }
        return product;
    }

    private async assertOptionAccess(userId: string, optionId: string) {
        const option = await this.prisma.productOption.findFirst({
            where: {
                id: optionId,
                product: { store: this.storeAccessFilter(userId) },
            },
            include: { values: true },
        });
        if (!option) {
            throw new NotFoundException('Opción no encontrada');
        }
        return option;
    }

    private async assertVariantAccess(userId: string, variantId: string) {
        const variant = await this.prisma.productVariant.findFirst({
            where: {
                id: variantId,
                product: { store: this.storeAccessFilter(userId) },
            },
        });
        if (!variant) {
            throw new NotFoundException('Variante no encontrada');
        }
        return variant;
    }

    // ============================================================
    // PRODUCT OPTIONS
    // ============================================================

    async findOptions(userId: string, productId: string) {
        await this.assertProductAccess(userId, productId);
        return this.prisma.productOption.findMany({
            where: { productId },
            include: {
                values: { orderBy: { position: 'asc' } },
            },
            orderBy: { position: 'asc' },
        });
    }

    async createOption(userId: string, productId: string, dto: CreateOptionDto) {
        await this.assertProductAccess(userId, productId);

        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: { options: true },
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        if (product.options.length >= MAX_OPTIONS_PER_PRODUCT) {
            throw new BadRequestException(
                `Máximo ${MAX_OPTIONS_PER_PRODUCT} opciones por producto`,
            );
        }

        const existingOption = product.options.find(
            (opt: { name: string }) => opt.name.toLowerCase() === dto.name.toLowerCase(),
        );
        if (existingOption) {
            throw new ConflictException(`Ya existe una opción llamada "${dto.name}"`);
        }

        return this.prisma.productOption.create({
            data: {
                productId,
                name: dto.name,
                position: dto.position ?? product.options.length,
                values: dto.values
                    ? {
                        create: dto.values.map((v, index) => ({
                            value: v.value,
                            position: v.position ?? index,
                        })),
                    }
                    : undefined,
            },
            include: {
                values: { orderBy: { position: 'asc' } },
            },
        });
    }

    async updateOption(userId: string, optionId: string, dto: UpdateOptionDto) {
        await this.assertOptionAccess(userId, optionId);

        return this.prisma.productOption.update({
            where: { id: optionId },
            data: {
                name: dto.name,
                position: dto.position,
            },
            include: {
                values: { orderBy: { position: 'asc' } },
            },
        });
    }

    async deleteOption(userId: string, optionId: string) {
        await this.assertOptionAccess(userId, optionId);

        await this.prisma.productOption.delete({
            where: { id: optionId },
        });

        return { message: 'Opción eliminada correctamente' };
    }

    async addOptionValue(userId: string, optionId: string, dto: AddOptionValueDto) {
        const option = await this.assertOptionAccess(userId, optionId);

        const existingValue = option.values.find(
            (v: { value: string }) => v.value.toLowerCase() === dto.value.toLowerCase(),
        );
        if (existingValue) {
            throw new ConflictException(`El valor "${dto.value}" ya existe`);
        }

        return this.prisma.productOptionValue.create({
            data: {
                optionId,
                value: dto.value,
                position: dto.position ?? option.values.length,
            },
        });
    }

    async deleteOptionValue(userId: string, valueId: string) {
        const value = await this.prisma.productOptionValue.findFirst({
            where: {
                id: valueId,
                option: {
                    product: { store: this.storeAccessFilter(userId) },
                },
            },
        });

        if (!value) {
            throw new NotFoundException('Valor de opción no encontrado');
        }

        await this.prisma.productOptionValue.delete({
            where: { id: valueId },
        });

        return { message: 'Valor eliminado correctamente' };
    }

    // ============================================================
    // PRODUCT VARIANTS
    // ============================================================

    async findVariants(userId: string, productId: string) {
        await this.assertProductAccess(userId, productId);
        return this.prisma.productVariant.findMany({
            where: { productId },
            orderBy: { position: 'asc' },
        });
    }

    async findVariantById(userId: string, variantId: string) {
        return this.assertVariantAccess(userId, variantId);
    }

    async createVariant(userId: string, productId: string, dto: CreateVariantDto) {
        await this.assertProductAccess(userId, productId);

        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: { variants: true },
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        if (product.variants.length >= MAX_VARIANTS_PER_PRODUCT) {
            throw new BadRequestException(
                `Máximo ${MAX_VARIANTS_PER_PRODUCT} variantes por producto`,
            );
        }

        return this.prisma.productVariant.create({
            data: {
                productId,
                name: dto.name,
                sku: dto.sku,
                barcode: dto.barcode,
                price: dto.price,
                compareAtPrice: dto.compareAtPrice,
                costPerItem: dto.costPerItem,
                stock: dto.stock ?? 0,
                trackInventory: dto.trackInventory ?? true,
                options: dto.options,
                weight: dto.weight,
                imageUrl: dto.imageUrl,
                position: dto.position ?? product.variants.length,
                isActive: dto.isActive ?? true,
            },
        });
    }

    async updateVariant(userId: string, variantId: string, dto: UpdateVariantDto) {
        await this.assertVariantAccess(userId, variantId);

        return this.prisma.productVariant.update({
            where: { id: variantId },
            data: {
                name: dto.name,
                sku: dto.sku,
                barcode: dto.barcode,
                price: dto.price,
                compareAtPrice: dto.compareAtPrice,
                costPerItem: dto.costPerItem,
                stock: dto.stock,
                trackInventory: dto.trackInventory,
                weight: dto.weight,
                imageUrl: dto.imageUrl,
                position: dto.position,
                isActive: dto.isActive,
            },
        });
    }

    async deleteVariant(userId: string, variantId: string) {
        await this.assertVariantAccess(userId, variantId);

        await this.prisma.productVariant.delete({
            where: { id: variantId },
        });

        return { message: 'Variante eliminada correctamente' };
    }

    async bulkUpdateVariants(userId: string, productId: string, dto: BulkUpdateVariantsDto) {
        await this.assertProductAccess(userId, productId);

        const variantIds = dto.variants.map((v) => v.id);
        const ownedCount = await this.prisma.productVariant.count({
            where: { id: { in: variantIds }, productId },
        });

        if (ownedCount !== variantIds.length) {
            throw new ForbiddenException('Algunas variantes no pertenecen a este producto');
        }

        const updates = dto.variants.map((variant) =>
            this.prisma.productVariant.update({
                where: { id: variant.id },
                data: {
                    price: variant.price,
                    stock: variant.stock,
                    sku: variant.sku,
                    isActive: variant.isActive,
                },
            }),
        );

        return this.prisma.$transaction(updates);
    }

    // ============================================================
    // VARIANT GENERATION
    // ============================================================

    async generateVariants(userId: string, productId: string, dto: GenerateVariantsDto = {}) {
        await this.assertProductAccess(userId, productId);

        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: {
                options: {
                    include: { values: { orderBy: { position: 'asc' } } },
                    orderBy: { position: 'asc' },
                },
                variants: true,
            },
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        if (product.options.length === 0) {
            throw new BadRequestException(
                'El producto no tiene opciones definidas. Crea opciones primero.',
            );
        }

        type OptionWithValues = { name: string; values: { value: string }[] };
        const emptyOptions = product.options.filter((opt: OptionWithValues) => opt.values.length === 0);
        if (emptyOptions.length > 0) {
            throw new BadRequestException(
                `Las siguientes opciones no tienen valores: ${emptyOptions.map((o: OptionWithValues) => o.name).join(', ')}`,
            );
        }

        const combinations = this.generateCartesianProduct(
            product.options.map((opt: OptionWithValues) =>
                opt.values.map((v: { value: string }) => ({ optionName: opt.name, value: v.value })),
            ),
        );

        if (product.variants.length + combinations.length > MAX_VARIANTS_PER_PRODUCT) {
            throw new BadRequestException(
                `Se generarían ${combinations.length} variantes, pero el límite es ${MAX_VARIANTS_PER_PRODUCT}. ` +
                `Actualmente hay ${product.variants.length} variantes.`,
            );
        }

        await this.prisma.productVariant.deleteMany({
            where: { productId },
        });

        const basePrice = dto.basePrice ?? Number(product.price);
        const initialStock = dto.initialStock ?? 0;

        const variantsData = combinations.map((combo, index) => {
            const optionsObj: Record<string, string> = {};
            combo.forEach((item) => {
                optionsObj[item.optionName] = item.value;
            });

            const name = combo.map((item) => item.value).join(' / ');

            return {
                productId,
                name,
                options: optionsObj,
                price: basePrice,
                stock: initialStock,
                trackInventory: true,
                position: index,
                isActive: true,
            };
        });

        await this.prisma.productVariant.createMany({
            data: variantsData,
        });

        return this.prisma.productVariant.findMany({
            where: { productId },
            orderBy: { position: 'asc' },
        });
    }

    private generateCartesianProduct(
        arrays: { optionName: string; value: string }[][],
    ): { optionName: string; value: string }[][] {
        if (arrays.length === 0) return [[]];

        return arrays.reduce<{ optionName: string; value: string }[][]>(
            (acc, curr) =>
                acc.flatMap((a) => curr.map((c) => [...a, c])),
            [[]],
        );
    }

    // ============================================================
    // STOCK SUMMARY
    // ============================================================

    async getStockSummary(userId: string, productId: string) {
        await this.assertProductAccess(userId, productId);

        const variants = await this.prisma.productVariant.findMany({
            where: { productId, isActive: true },
            select: { id: true, name: true, stock: true },
        });

        type V = { id: string; name: string; stock: number };
        const totalStock = variants.reduce((sum: number, v: V) => sum + v.stock, 0);
        const inStockCount = variants.filter((v: V) => v.stock > 0).length;
        const outOfStockCount = variants.filter((v: V) => v.stock === 0).length;
        const lowStockVariants = variants.filter((v: V) => v.stock > 0 && v.stock <= 5);

        return {
            totalStock,
            variantsCount: variants.length,
            inStock: inStockCount,
            outOfStock: outOfStockCount,
            lowStock: lowStockVariants,
        };
    }
}
