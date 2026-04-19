import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WholesaleSenderType } from '@prisma/client';

@Injectable()
export class WholesaleChatService {
    private readonly logger = new Logger(WholesaleChatService.name);

    constructor(private readonly prisma: PrismaService) {}

    async getChatForStore(storeId: string, requestId: string, opts: { limit?: number; before?: string } = {}) {
        const request = await this.prisma.wholesaleRequest.findFirst({
            where: { id: requestId, storeId },
            include: { chat: true },
        });
        if (!request || !request.chat) throw new NotFoundException('Chat no encontrado');

        const messages = await this.prisma.wholesaleChatMessage.findMany({
            where: {
                chatId: request.chat.id,
                ...(opts.before && { createdAt: { lt: new Date(opts.before) } }),
            },
            orderBy: { createdAt: 'desc' },
            take: opts.limit ?? 50,
        });

        return {
            chat: request.chat,
            messages: messages.reverse(),
        };
    }

    async getChatForBuyer(buyerUserId: string, requestId: string, opts: { limit?: number; before?: string } = {}) {
        const request = await this.prisma.wholesaleRequest.findFirst({
            where: { id: requestId, buyerUserId },
            include: { chat: true },
        });
        if (!request || !request.chat) throw new NotFoundException('Chat no encontrado');

        const messages = await this.prisma.wholesaleChatMessage.findMany({
            where: {
                chatId: request.chat.id,
                ...(opts.before && { createdAt: { lt: new Date(opts.before) } }),
            },
            orderBy: { createdAt: 'desc' },
            take: opts.limit ?? 50,
        });

        return {
            chat: request.chat,
            messages: messages.reverse(),
        };
    }

    async sendAsMerchant(storeId: string, requestId: string, userId: string, body: string) {
        const request = await this.prisma.wholesaleRequest.findFirst({
            where: { id: requestId, storeId },
            include: { chat: true },
        });
        if (!request || !request.chat) throw new NotFoundException('Chat no encontrado');
        if (request.chat.closedAt) throw new ForbiddenException('Chat cerrado');

        return this.prisma.$transaction(async (tx) => {
            const message = await tx.wholesaleChatMessage.create({
                data: {
                    chatId: request.chat!.id,
                    senderType: WholesaleSenderType.MERCHANT,
                    senderUserId: userId,
                    body,
                },
            });

            await tx.wholesaleChat.update({
                where: { id: request.chat!.id },
                data: {
                    unreadByBuyer: { increment: 1 },
                    unreadByMerchant: 0,
                    lastMessageAt: message.createdAt,
                },
            });

            return message;
        });
    }

    async sendAsBuyer(buyerUserId: string, requestId: string, body: string) {
        const request = await this.prisma.wholesaleRequest.findFirst({
            where: { id: requestId, buyerUserId },
            include: { chat: true },
        });
        if (!request || !request.chat) throw new NotFoundException('Chat no encontrado');
        if (request.chat.closedAt) throw new ForbiddenException('Chat cerrado');

        return this.prisma.$transaction(async (tx) => {
            const message = await tx.wholesaleChatMessage.create({
                data: {
                    chatId: request.chat!.id,
                    senderType: WholesaleSenderType.BUYER,
                    senderBuyerId: buyerUserId,
                    body,
                },
            });

            await tx.wholesaleChat.update({
                where: { id: request.chat!.id },
                data: {
                    unreadByMerchant: { increment: 1 },
                    unreadByBuyer: 0,
                    lastMessageAt: message.createdAt,
                },
            });

            return message;
        });
    }

    async markReadByMerchant(storeId: string, requestId: string) {
        const request = await this.prisma.wholesaleRequest.findFirst({
            where: { id: requestId, storeId },
            include: { chat: true },
        });
        if (!request?.chat) throw new NotFoundException('Chat no encontrado');
        await this.prisma.wholesaleChat.update({
            where: { id: request.chat.id },
            data: { unreadByMerchant: 0 },
        });
        return { ok: true };
    }

    async markReadByBuyer(buyerUserId: string, requestId: string) {
        const request = await this.prisma.wholesaleRequest.findFirst({
            where: { id: requestId, buyerUserId },
            include: { chat: true },
        });
        if (!request?.chat) throw new NotFoundException('Chat no encontrado');
        await this.prisma.wholesaleChat.update({
            where: { id: request.chat.id },
            data: { unreadByBuyer: 0 },
        });
        return { ok: true };
    }
}
