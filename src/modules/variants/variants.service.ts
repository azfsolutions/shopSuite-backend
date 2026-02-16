import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
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

    // ============================================================
    // PRODUCT OPTIONS
    // ============================================================

    async findOptions(productId: string) {
        return this.prisma.productOption.findMany({
            where: { productId },
            include: {
                values: { orderBy: { position: 'asc' } },
            },
            orderBy: { position: 'asc' },
        });
    }

    async createOption(productId: string, dto: CreateOptionDto) {
        // Verificar que el producto existe
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: { options: true },
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        // Verificar límite de opciones
        if (product.options.length >= MAX_OPTIONS_PER_PRODUCT) {
            throw new BadRequestException(
                `Máximo ${MAX_OPTIONS_PER_PRODUCT} opciones por producto`,
            );
        }

        // Verificar que no exista una opción con el mismo nombre
        const existingOption = product.options.find(
            (opt) => opt.name.toLowerCase() === dto.name.toLowerCase(),
        );
        if (existingOption) {
            throw new ConflictException(`Ya existe una opción llamada "${dto.name}"`);
        }

        // Crear opción con valores si se proporcionan
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

    async updateOption(optionId: string, dto: UpdateOptionDto) {
        const option = await this.prisma.productOption.findUnique({
            where: { id: optionId },
        });

        if (!option) {
            throw new NotFoundException('Opción no encontrada');
        }

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

    async deleteOption(optionId: string) {
        const option = await this.prisma.productOption.findUnique({
            where: { id: optionId },
        });

        if (!option) {
            throw new NotFoundException('Opción no encontrada');
        }

        // Cascade delete eliminará los valores automáticamente
        await this.prisma.productOption.delete({
            where: { id: optionId },
        });

        return { message: 'Opción eliminada correctamente' };
    }

    async addOptionValue(optionId: string, dto: AddOptionValueDto) {
        const option = await this.prisma.productOption.findUnique({
            where: { id: optionId },
            include: { values: true },
        });

        if (!option) {
            throw new NotFoundException('Opción no encontrada');
        }

        // Verificar que no exista un valor duplicado
        const existingValue = option.values.find(
            (v) => v.value.toLowerCase() === dto.value.toLowerCase(),
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

    async deleteOptionValue(valueId: string) {
        const value = await this.prisma.productOptionValue.findUnique({
            where: { id: valueId },
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

    async findVariants(productId: string) {
        return this.prisma.productVariant.findMany({
            where: { productId },
            orderBy: { position: 'asc' },
        });
    }

    async findVariantById(variantId: string) {
        const variant = await this.prisma.productVariant.findUnique({
            where: { id: variantId },
        });

        if (!variant) {
            throw new NotFoundException('Variante no encontrada');
        }

        return variant;
    }

    async createVariant(productId: string, dto: CreateVariantDto) {
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

    async updateVariant(variantId: string, dto: UpdateVariantDto) {
        const variant = await this.prisma.productVariant.findUnique({
            where: { id: variantId },
        });

        if (!variant) {
            throw new NotFoundException('Variante no encontrada');
        }

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

    async deleteVariant(variantId: string) {
        const variant = await this.prisma.productVariant.findUnique({
            where: { id: variantId },
        });

        if (!variant) {
            throw new NotFoundException('Variante no encontrada');
        }

        await this.prisma.productVariant.delete({
            where: { id: variantId },
        });

        return { message: 'Variante eliminada correctamente' };
    }

    async bulkUpdateVariants(productId: string, dto: BulkUpdateVariantsDto) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado');
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

    async generateVariants(productId: string, dto: GenerateVariantsDto = {}) {
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

        // Verificar que todas las opciones tengan al menos un valor
        const emptyOptions = product.options.filter((opt) => opt.values.length === 0);
        if (emptyOptions.length > 0) {
            throw new BadRequestException(
                `Las siguientes opciones no tienen valores: ${emptyOptions.map((o) => o.name).join(', ')}`,
            );
        }

        // Generar producto cartesiano de todas las combinaciones
        const combinations = this.generateCartesianProduct(
            product.options.map((opt) =>
                opt.values.map((v) => ({ optionName: opt.name, value: v.value })),
            ),
        );

        // Verificar límite
        if (product.variants.length + combinations.length > MAX_VARIANTS_PER_PRODUCT) {
            throw new BadRequestException(
                `Se generarían ${combinations.length} variantes, pero el límite es ${MAX_VARIANTS_PER_PRODUCT}. ` +
                `Actualmente hay ${product.variants.length} variantes.`,
            );
        }

        // Eliminar variantes existentes (regenerar desde cero)
        await this.prisma.productVariant.deleteMany({
            where: { productId },
        });

        // Crear nuevas variantes
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

        // Retornar las variantes creadas
        return this.findVariants(productId);
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

    async getStockSummary(productId: string) {
        const variants = await this.prisma.productVariant.findMany({
            where: { productId, isActive: true },
            select: { id: true, name: true, stock: true },
        });

        const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
        const inStockCount = variants.filter((v) => v.stock > 0).length;
        const outOfStockCount = variants.filter((v) => v.stock === 0).length;
        const lowStockVariants = variants.filter((v) => v.stock > 0 && v.stock <= 5);

        return {
            totalStock,
            variantsCount: variants.length,
            inStock: inStockCount,
            outOfStock: outOfStockCount,
            lowStock: lowStockVariants,
        };
    }
}
