import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { AuthGuard } from '../../core/guards';
import { CurrentStore } from '../../core/decorators/current-store.decorator';
import { SubscriptionStatus } from '@prisma/client';
import { RequestUpgradeDto } from './dto/request-upgrade.dto';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';

// ============================================================
// PUBLIC CONTROLLER - Plans
// ============================================================

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
    constructor(private readonly subscriptionsService: SubscriptionsService) { }

    @Get()
    @ApiOperation({ summary: 'Listar todos los planes disponibles' })
    @ApiResponse({ status: 200, description: 'Lista de planes' })
    getAllPlans() {
        return this.subscriptionsService.getAllPlans();
    }

    @Get(':type')
    @ApiOperation({ summary: 'Obtener plan por tipo' })
    @ApiResponse({ status: 200, description: 'Plan encontrado' })
    getPlanByType(@Param('type') type: string) {
        return this.subscriptionsService.getPlanByType(type as any);
    }
}

// ============================================================
// DASHBOARD CONTROLLER - Subscription
// ============================================================

@ApiTags('Subscription')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('subscription')
export class SubscriptionController {
    constructor(private readonly subscriptionsService: SubscriptionsService) { }

    @Get()
    @ApiOperation({ summary: 'Obtener mi suscripción actual' })
    @ApiResponse({ status: 200, description: 'Suscripción con plan' })
    getSubscription(@CurrentStore('id') storeId: string) {
        return this.subscriptionsService.getSubscription(storeId);
    }

    @Get('usage')
    @ApiOperation({ summary: 'Obtener uso actual vs límites' })
    @ApiResponse({ status: 200, description: 'Métricas de uso' })
    getUsage(@CurrentStore('id') storeId: string) {
        return this.subscriptionsService.getUsage(storeId);
    }

    @Post('upgrade')
    @ApiOperation({ summary: 'Solicitar upgrade a un plan superior' })
    @ApiResponse({ status: 200, description: 'Solicitud registrada' })
    requestUpgrade(
        @CurrentStore('id') storeId: string,
        @Body() dto: RequestUpgradeDto,
    ) {
        return this.subscriptionsService.requestUpgrade(storeId, dto.planType);
    }

    @Post('cancel')
    @ApiOperation({ summary: 'Cancelar suscripción (downgrade a FREE)' })
    @ApiResponse({ status: 200, description: 'Suscripción cancelada' })
    cancelSubscription(@CurrentStore('id') storeId: string) {
        return this.subscriptionsService.cancelSubscription(storeId);
    }
}

// ============================================================
// ADMIN CONTROLLER - Super Admin
// ============================================================

@ApiTags('Admin - Subscriptions')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('admin/subscriptions')
export class AdminSubscriptionsController {
    constructor(private readonly subscriptionsService: SubscriptionsService) { }

    @Get()
    @ApiOperation({ summary: 'Listar todas las suscripciones' })
    @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus })
    @ApiResponse({ status: 200, description: 'Lista de suscripciones' })
    getAllSubscriptions(@Query('status') status?: SubscriptionStatus) {
        return this.subscriptionsService.getAllSubscriptions(status);
    }

    @Patch(':id/activate')
    @ApiOperation({ summary: 'Activar suscripción manualmente' })
    @ApiResponse({ status: 200, description: 'Suscripción activada' })
    activateSubscription(
        @Param('id') subscriptionId: string,
        @Body() dto: ActivateSubscriptionDto,
    ) {
        return this.subscriptionsService.activateSubscription(subscriptionId, dto.planType);
    }
}
