import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { WholesaleChatService } from './wholesale-chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { BuyerAuthGuard } from '../buyer-auth/guards/buyer-auth.guard';

@ApiTags('wholesale-chat-buyer')
@Controller('storefront/:slug/wholesale/requests/:requestId/chat')
@UseGuards(BuyerAuthGuard)
@ApiCookieAuth('buyer_token')
export class WholesaleChatBuyerController {
    constructor(private readonly service: WholesaleChatService) {}

    @Get()
    async get(
        @Param('requestId') requestId: string,
        @Req() req: any,
        @Query('limit') limit?: string,
        @Query('before') before?: string,
    ) {
        return this.service.getChatForBuyer(req.buyerUser.id, requestId, {
            limit: limit ? parseInt(limit, 10) : undefined,
            before,
        });
    }

    @Post('messages')
    async send(
        @Param('requestId') requestId: string,
        @Body() dto: SendMessageDto,
        @Req() req: any,
    ) {
        return this.service.sendAsBuyer(req.buyerUser.id, requestId, dto.body);
    }

    @Post('read')
    async markRead(@Param('requestId') requestId: string, @Req() req: any) {
        return this.service.markReadByBuyer(req.buyerUser.id, requestId);
    }
}
