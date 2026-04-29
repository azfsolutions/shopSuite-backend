import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { B2BQuoteStatus, CustomerType, Prisma, StockReservationReason } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { B2BQuotePdfService } from './b2b-quote-pdf.service';
import { StockReservationsService } from '../stock-reservations/stock-reservations.service';

@Injectable()
export class B2BQuotesService {
    private readonly logger = new Logger(B2BQuotesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly pdf: B2BQuotePdfService,
        private readonly stock: StockReservationsService,
    ) {}

    async create(storeId: string, dto: CreateQuoteDto) {
        const customer = await this.prisma.customer.findFirst({
            where: { id: dto.customerId, storeId, deletedAt: null },
            select: { id: true, customerType: true },
        });
        if (!customer) throw new NotFoundException('Cliente no encontrado');
        if (customer.customerType !== CustomerType.B2B_VIP) {
            throw new ForbiddenException('Solo clientes B2B_VIP pueden recibir cotizaciones');
        }

        const catalog = await this.prisma.b2BCatalog.findUnique({
            where: { customerId: dto.customerId },
            include: { items: { select: { productId: true, price: true, enabled: true } } },
        });
        if (!catalog) {
            throw new BadRequestException('El cliente no tiene catálogo B2B configurado');
        }

        const productIds = dto.items.map((i) => i.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds }, storeId, deletedAt: null },
            select: { id: true, name: true },
        });
        if (products.length !== productIds.length) {
            throw new BadRequestException('Uno o más productos no pertenecen a la tienda');
        }

        const itemsData = dto.items.map((i) => {
            const subtotal = new Decimal(i.unitPrice).mul(i.quantity);
            return {
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: new Decimal(i.unitPrice),
                subtotal,
            };
        });
        const subtotal = itemsData.reduce((sum, i) => sum.add(i.subtotal), new Decimal(0));

        const number = await this.generateNumber(storeId);

        return this.prisma.$transaction(async (tx) => {
            const quote = await tx.b2BQuote.create({
                data: {
                    storeId,
                    catalogId: catalog.id,
                    customerId: dto.customerId,
                    number,
                    status: B2BQuoteStatus.DRAFT,
                    subtotal,
                    total: subtotal,
                    validUntil: new Date(dto.validUntil),
                    paymentTerms: dto.paymentTerms,
                    deliveryTerms: dto.deliveryTerms,
                    notes: dto.notes,
                    items: { create: itemsData },
                },
                include: { items: true },
            });

            this.logger.log({ event: 'B2B_QUOTE_CREATED', storeId, quoteId: quote.id, number });
            return quote;
        });
    }

    async send(storeId: string, quoteId: string) {
        const quote = await this.findOrFail(storeId, quoteId);
        if (quote.status !== B2BQuoteStatus.DRAFT) {
            throw new BadRequestException('Solo cotizaciones en DRAFT pueden enviarse');
        }

        const settings = await this.prisma.wholesaleSettings.findUnique({
            where: { storeId },
        });
        const ttlDays = settings?.reservationDays ?? 7;

        const buffer = await this.renderPdf(storeId, quoteId);

        await this.prisma.$transaction(async (tx) => {
            await tx.b2BQuote.update({
                where: { id: quoteId },
                data: {
                    status: B2BQuoteStatus.SENT,
                    sentAt: new Date(),
                    pdfUrl: `/api/stores/${storeId}/b2b-quotes/${quoteId}/pdf`,
                },
            });

            for (const item of quote.items) {
                await this.stock.reserveForVip({
                    storeId,
                    customerId: quote.customerId,
                    productId: item.productId,
                    quantity: item.quantity,
                    reason: StockReservationReason.VIP_QUOTE,
                    sourceId: quoteId,
                    ttlDays,
                    tx,
                });
            }
        });

        this.logger.log({ event: 'B2B_QUOTE_SENT', storeId, quoteId, ttlDays });
        return { ok: true, pdfBytes: buffer.length };
    }

    async markViewed(storeId: string, customerId: string, quoteId: string) {
        const quote = await this.prisma.b2BQuote.findFirst({
            where: { id: quoteId, storeId, customerId },
        });
        if (!quote) throw new NotFoundException('Cotización no encontrada');
        if (quote.status === B2BQuoteStatus.SENT) {
            await this.prisma.b2BQuote.update({
                where: { id: quoteId },
                data: { status: B2BQuoteStatus.VIEWED, viewedAt: new Date() },
            });
        }
        return { ok: true };
    }

    async accept(storeId: string, customerId: string, quoteId: string) {
        const quote = await this.prisma.b2BQuote.findFirst({
            where: { id: quoteId, storeId, customerId },
            include: { items: true },
        });
        if (!quote) throw new NotFoundException('Cotización no encontrada');
        if (quote.status !== B2BQuoteStatus.SENT && quote.status !== B2BQuoteStatus.VIEWED) {
            throw new BadRequestException('Cotización no aceptable en este estado');
        }
        if (quote.validUntil < new Date()) {
            throw new BadRequestException('Cotización expirada');
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.b2BQuote.update({
                where: { id: quoteId },
                data: { status: B2BQuoteStatus.ACCEPTED, acceptedAt: new Date() },
            });

            const orderNumber = await this.generateOrderNumber(storeId, tx);
            const order = await tx.b2BOrder.create({
                data: {
                    storeId,
                    customerId,
                    quoteId,
                    number: orderNumber,
                    subtotal: quote.subtotal,
                    total: quote.total,
                },
            });

            this.logger.log({ event: 'B2B_QUOTE_ACCEPTED', storeId, quoteId, orderId: order.id });
            return order;
        });
    }

    async reject(storeId: string, customerId: string, quoteId: string) {
        const quote = await this.prisma.b2BQuote.findFirst({
            where: { id: quoteId, storeId, customerId },
        });
        if (!quote) throw new NotFoundException('Cotización no encontrada');

        await this.prisma.$transaction(async (tx) => {
            await tx.b2BQuote.update({
                where: { id: quoteId },
                data: { status: B2BQuoteStatus.REJECTED, rejectedAt: new Date() },
            });
            await this.stock.releaseBySource(quoteId, tx);
        });

        this.logger.log({ event: 'B2B_QUOTE_REJECTED', storeId, quoteId });
        return { ok: true };
    }

    async listForStore(storeId: string, status?: B2BQuoteStatus) {
        return this.prisma.b2BQuote.findMany({
            where: { storeId, ...(status && { status }) },
            orderBy: { createdAt: 'desc' },
            include: {
                customer: { select: { id: true, email: true, firstName: true, lastName: true } },
                items: { select: { id: true, quantity: true, unitPrice: true, subtotal: true } },
            },
        });
    }

    async getForStore(storeId: string, quoteId: string) {
        return this.findOrFail(storeId, quoteId);
    }

    async listForBuyer(storeId: string, customerId: string) {
        return this.prisma.b2BQuote.findMany({
            where: { storeId, customerId, status: { not: B2BQuoteStatus.DRAFT } },
            orderBy: { createdAt: 'desc' },
            include: {
                items: { include: { product: { select: { name: true, slug: true } } } },
            },
        });
    }

    async renderPdf(storeId: string, quoteId: string): Promise<Buffer> {
        const quote = await this.prisma.b2BQuote.findFirst({
            where: { id: quoteId, storeId },
            include: {
                store: { select: { name: true } },
                customer: { select: { email: true, firstName: true, lastName: true } },
                items: { include: { product: { select: { name: true } } } },
            },
        });
        if (!quote) throw new NotFoundException('Cotización no encontrada');

        return this.pdf.render({
            storeName: quote.store.name,
            customerName: `${quote.customer.firstName ?? ''} ${quote.customer.lastName ?? ''}`.trim() || quote.customer.email,
            customerEmail: quote.customer.email,
            quoteNumber: quote.number,
            issuedAt: quote.createdAt,
            validUntil: quote.validUntil,
            items: quote.items.map((i) => ({
                name: i.product.name,
                quantity: i.quantity,
                unitPrice: Number(i.unitPrice),
                subtotal: Number(i.subtotal),
            })),
            subtotal: Number(quote.subtotal),
            total: Number(quote.total),
            paymentTerms: quote.paymentTerms,
            deliveryTerms: quote.deliveryTerms,
            notes: quote.notes,
        });
    }

    private async findOrFail(storeId: string, quoteId: string) {
        const quote = await this.prisma.b2BQuote.findFirst({
            where: { id: quoteId, storeId },
            include: {
                customer: { select: { id: true, email: true, firstName: true, lastName: true } },
                items: { include: { product: { select: { id: true, name: true, slug: true } } } },
            },
        });
        if (!quote) throw new NotFoundException('Cotización no encontrada');
        return quote;
    }

    private async generateNumber(storeId: string): Promise<string> {
        const count = await this.prisma.b2BQuote.count({ where: { storeId } });
        return `Q-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    }

    private async generateOrderNumber(storeId: string, tx: Prisma.TransactionClient): Promise<string> {
        const count = await tx.b2BOrder.count({ where: { storeId } });
        return `BO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    }
}
