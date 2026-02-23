import {
    Controller,
    Post,
    Delete,
    Get,
    Body,
    Param,
    UseGuards,
    Request,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NewsletterService } from './newsletter.service';
import { OptionalBuyerAuthGuard } from '../../../buyer-auth/guards/optional-buyer-auth.guard';
import { BuyerAuthGuard } from '../../../buyer-auth/guards/buyer-auth.guard';
import { PrismaService } from '../../../../database/prisma.service';

class StorefrontSubscribeDto {
    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty({ default: true })
    @IsBoolean()
    consentGiven: boolean;
}

@ApiTags('storefront-newsletter')
@Controller('storefront/:storeSlug/subscribe')
export class NewsletterPublicController {
    constructor(
        private readonly newsletterService: NewsletterService,
        private readonly prisma: PrismaService,
    ) {}

    private async getStoreId(storeSlug: string): Promise<string> {
        const store = await this.prisma.store.findUnique({
            where: { slug: storeSlug },
            select: { id: true },
        });
        if (!store) throw new NotFoundException('Tienda no encontrada');
        return store.id;
    }

    @Post()
    @UseGuards(OptionalBuyerAuthGuard)
    @ApiOperation({ summary: 'Suscribirse al newsletter de la tienda' })
    async subscribe(
        @Param('storeSlug') storeSlug: string,
        @Body() dto: StorefrontSubscribeDto,
        @Request() req: any,
    ) {
        const storeId = await this.getStoreId(storeSlug);
        const buyerUserId: string | null = req.buyerUser?.id ?? null;

        // Check if already subscribed
        const existing = await this.prisma.newsletterSubscriber.findFirst({
            where: { storeId, email: dto.email.toLowerCase() },
        });

        if (existing) {
            if (!existing.isActive) {
                await this.prisma.newsletterSubscriber.update({
                    where: { id: existing.id },
                    data: { isActive: true, buyerUserId, consentAt: new Date() },
                });
                return { message: 'Suscripción reactivada', subscribed: true };
            }
            return { message: 'Ya estás suscrito', subscribed: true };
        }

        await this.prisma.newsletterSubscriber.create({
            data: {
                storeId,
                email: dto.email.toLowerCase(),
                buyerUserId,
                consentAt: new Date(),
                isActive: true,
            },
        });

        return { message: 'Suscripción exitosa', subscribed: true };
    }

    @Delete()
    @UseGuards(OptionalBuyerAuthGuard)
    @ApiOperation({ summary: 'Cancelar suscripción' })
    async unsubscribe(
        @Param('storeSlug') storeSlug: string,
        @Body() body: { email: string },
    ) {
        const storeId = await this.getStoreId(storeSlug);
        return this.newsletterService.unsubscribe(storeId, body.email);
    }

    @Get('status')
    @UseGuards(BuyerAuthGuard)
    @ApiOperation({ summary: 'Verificar estado de suscripción del comprador' })
    async getStatus(
        @Param('storeSlug') storeSlug: string,
        @Request() req: any,
    ) {
        const storeId = await this.getStoreId(storeSlug);
        const subscriber = await this.prisma.newsletterSubscriber.findFirst({
            where: { storeId, buyerUserId: req.buyerUser.id, isActive: true },
        });
        return { isSubscribed: !!subscriber };
    }
}
