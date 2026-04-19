import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WholesaleChatService } from './wholesale-chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { AuthGuard, GlobalRoleGuard, RolesGuard, StoreAccessGuard } from '../../core/guards';
import { CurrentUser, RequireGlobalRole, Roles } from '../../core/decorators';
import { StoreRole } from '@prisma/client';

@ApiTags('wholesale-chat-admin')
@Controller('stores/:storeId/wholesale/requests/:requestId/chat')
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard, RolesGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class WholesaleChatAdminController {
    constructor(private readonly service: WholesaleChatService) {}

    @Get()
    @Roles(StoreRole.SUPPORT, StoreRole.EDITOR, StoreRole.MANAGER, StoreRole.ADMIN)
    async get(
        @Param('storeId') storeId: string,
        @Param('requestId') requestId: string,
        @Query('limit') limit?: string,
        @Query('before') before?: string,
    ) {
        return this.service.getChatForStore(storeId, requestId, {
            limit: limit ? parseInt(limit, 10) : undefined,
            before,
        });
    }

    @Post('messages')
    @Roles(StoreRole.SUPPORT, StoreRole.EDITOR, StoreRole.MANAGER, StoreRole.ADMIN)
    async send(
        @Param('storeId') storeId: string,
        @Param('requestId') requestId: string,
        @Body() dto: SendMessageDto,
        @CurrentUser('id') userId: string,
    ) {
        return this.service.sendAsMerchant(storeId, requestId, userId, dto.body);
    }

    @Post('read')
    @Roles(StoreRole.SUPPORT, StoreRole.EDITOR, StoreRole.MANAGER, StoreRole.ADMIN)
    async markRead(
        @Param('storeId') storeId: string,
        @Param('requestId') requestId: string,
    ) {
        return this.service.markReadByMerchant(storeId, requestId);
    }
}
