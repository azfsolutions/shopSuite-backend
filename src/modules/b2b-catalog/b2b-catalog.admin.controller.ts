import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { B2BCatalogService } from './b2b-catalog.service';
import { UpsertCatalogDto } from './dto/upsert-catalog.dto';
import { AuthGuard, GlobalRoleGuard, RolesGuard, StoreAccessGuard } from '../../core/guards';
import { RequireGlobalRole, Roles } from '../../core/decorators';
import { StoreRole } from '@prisma/client';

@ApiTags('b2b-catalog-admin')
@Controller('stores/:storeId/customers/:customerId/b2b-catalog')
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard, RolesGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class B2BCatalogAdminController {
    constructor(private readonly service: B2BCatalogService) {}

    @Get()
    @Roles(StoreRole.SUPPORT, StoreRole.EDITOR, StoreRole.MANAGER, StoreRole.ADMIN)
    async get(
        @Param('storeId') storeId: string,
        @Param('customerId') customerId: string,
    ) {
        return this.service.getOrCreate(storeId, customerId);
    }

    @Put()
    @Roles(StoreRole.MANAGER, StoreRole.ADMIN)
    async upsert(
        @Param('storeId') storeId: string,
        @Param('customerId') customerId: string,
        @Body() dto: UpsertCatalogDto,
    ) {
        return this.service.upsertForStore(storeId, customerId, dto);
    }
}
