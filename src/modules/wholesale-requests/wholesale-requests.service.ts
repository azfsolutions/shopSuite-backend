import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateWholesaleRequestDto } from './dto/create-wholesale-request.dto';
import { UpdateWholesaleRequestDto } from './dto/update-wholesale-request.dto';
import { CustomerType, WholesaleRequestStatus, WholesaleSenderType } from '@prisma/client';
import { CustomerTiersService } from '../customer-tiers/customer-tiers.service';

const TERMINAL: WholesaleRequestStatus[] = [
    WholesaleRequestStatus.APPROVED,
    WholesaleRequestStatus.REJECTED,
];

@Injectable()
export class WholesaleRequestsService {
    private readonly logger = new Logger(WholesaleRequestsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly customerTiers: CustomerTiersService,
    ) {}

    async createFromBuyer(
        storeId: string,
        buyerUserId: string,
        dto: CreateWholesaleRequestDto,
    ) {
        const settings = await this.prisma.wholesaleSettings.findUnique({
            where: { storeId },
        });
        if (!settings || !settings.enabled) {
            throw new BadRequestException('La tienda no acepta solicitudes mayoristas');
        }

        const buyer = await this.prisma.buyerUser.findUnique({
            where: { id: buyerUserId },
            select: { id: true, email: true },
        });
        if (!buyer) throw new NotFoundException('Buyer no encontrado');

        const open = await this.prisma.wholesaleRequest.findFirst({
            where: {
                storeId,
                buyerUserId,
                status: { notIn: TERMINAL },
            },
        });
        if (open) throw new ConflictException('Ya tienes una solicitud abierta');

        const customer = await this.prisma.customer.findFirst({
            where: { storeId, email: buyer.email, deletedAt: null },
            select: { id: true },
        });

        return this.prisma.$transaction(async (tx) => {
            const request = await tx.wholesaleRequest.create({
                data: {
                    storeId,
                    buyerUserId,
                    customerId: customer?.id,
                    initialMessage: dto.initialMessage,
                },
            });

            const chat = await tx.wholesaleChat.create({
                data: {
                    wholesaleRequestId: request.id,
                    unreadByMerchant: dto.initialMessage ? 1 : 0,
                    lastMessageAt: dto.initialMessage ? new Date() : null,
                },
            });

            if (dto.initialMessage) {
                await tx.wholesaleChatMessage.create({
                    data: {
                        chatId: chat.id,
                        senderType: WholesaleSenderType.BUYER,
                        senderBuyerId: buyerUserId,
                        body: dto.initialMessage,
                    },
                });
            }

            this.logger.log({
                event: 'WHOLESALE_REQUEST_CREATED',
                storeId,
                buyerUserId,
                requestId: request.id,
            });

            return request;
        });
    }

    async listForStore(storeId: string, status?: WholesaleRequestStatus) {
        return this.prisma.wholesaleRequest.findMany({
            where: { storeId, ...(status && { status }) },
            orderBy: { createdAt: 'desc' },
            include: {
                buyerUser: { select: { id: true, email: true, firstName: true, lastName: true } },
                customer: { select: { id: true, customerType: true, ordersCount: true, totalSpent: true } },
                chat: { select: { unreadByMerchant: true, lastMessageAt: true } },
            },
        });
    }

    async getForStore(storeId: string, requestId: string) {
        const request = await this.prisma.wholesaleRequest.findFirst({
            where: { id: requestId, storeId },
            include: {
                buyerUser: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
                customer: true,
                chat: true,
            },
        });
        if (!request) throw new NotFoundException('Solicitud no encontrada');
        return request;
    }

    async updateForStore(
        storeId: string,
        requestId: string,
        dto: UpdateWholesaleRequestDto,
        actorUserId: string,
    ) {
        const request = await this.prisma.wholesaleRequest.findFirst({
            where: { id: requestId, storeId },
        });
        if (!request) throw new NotFoundException('Solicitud no encontrada');
        if (TERMINAL.includes(request.status) && dto.status && dto.status !== request.status) {
            throw new ConflictException('Solicitud ya cerrada');
        }

        const data: Parameters<typeof this.prisma.wholesaleRequest.update>[0]['data'] = {
            ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
        };

        if (dto.status === WholesaleRequestStatus.APPROVED) {
            data.status = WholesaleRequestStatus.APPROVED;
            data.approvedAt = new Date();
            data.approvedById = actorUserId;
        } else if (dto.status === WholesaleRequestStatus.REJECTED) {
            data.status = WholesaleRequestStatus.REJECTED;
            data.rejectedAt = new Date();
            data.rejectionReason = dto.rejectionReason ?? null;
        } else if (dto.status) {
            data.status = dto.status;
        }

        const updated = await this.prisma.wholesaleRequest.update({
            where: { id: requestId },
            data,
        });

        if (dto.status === WholesaleRequestStatus.APPROVED) {
            const customerId = await this.ensureCustomerId(storeId, request.buyerUserId, request.customerId);
            await this.customerTiers.setTier(storeId, customerId, CustomerType.B2B_VIP, actorUserId);
            await this.prisma.wholesaleRequest.update({
                where: { id: requestId },
                data: { customerId },
            });
        }

        this.logger.log({
            event: 'WHOLESALE_REQUEST_UPDATED',
            storeId,
            requestId,
            actorUserId,
            status: updated.status,
        });

        return updated;
    }

    async listForBuyer(buyerUserId: string) {
        return this.prisma.wholesaleRequest.findMany({
            where: { buyerUserId },
            orderBy: { createdAt: 'desc' },
            include: {
                store: { select: { id: true, name: true, slug: true } },
                chat: { select: { unreadByBuyer: true, lastMessageAt: true } },
            },
        });
    }

    async resolveStoreIdBySlug(slug: string): Promise<string> {
        const store = await this.prisma.store.findUnique({
            where: { slug },
            select: { id: true },
        });
        if (!store) throw new NotFoundException('Tienda no encontrada');
        return store.id;
    }

    async getForBuyer(buyerUserId: string, requestId: string) {
        const request = await this.prisma.wholesaleRequest.findFirst({
            where: { id: requestId, buyerUserId },
            include: {
                store: { select: { id: true, name: true, slug: true } },
                chat: true,
            },
        });
        if (!request) throw new NotFoundException('Solicitud no encontrada');
        return request;
    }

    private async ensureCustomerId(
        storeId: string,
        buyerUserId: string,
        existing: string | null,
    ): Promise<string> {
        if (existing) return existing;

        const buyer = await this.prisma.buyerUser.findUnique({
            where: { id: buyerUserId },
            select: { id: true, email: true, firstName: true, lastName: true, phone: true },
        });
        if (!buyer) throw new NotFoundException('Buyer no encontrado');

        const found = await this.prisma.customer.findFirst({
            where: { storeId, email: buyer.email, deletedAt: null },
            select: { id: true },
        });
        if (found) return found.id;

        const created = await this.prisma.customer.create({
            data: {
                storeId,
                buyerUserId,
                email: buyer.email,
                firstName: buyer.firstName,
                lastName: buyer.lastName,
                phone: buyer.phone,
            },
            select: { id: true },
        });
        return created.id;
    }
}
