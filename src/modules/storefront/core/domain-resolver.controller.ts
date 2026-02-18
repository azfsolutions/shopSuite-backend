import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '@/core/decorators';
import { StorefrontService } from './storefront.service';

@ApiTags('storefront')
@Controller('storefront')
@Public()
export class DomainResolverController {
    constructor(private readonly storefrontService: StorefrontService) {}

    @Get('resolve-domain')
    @ApiOperation({ summary: 'Resolve store by custom domain or subdomain' })
    @ApiQuery({ name: 'domain', required: true, type: String })
    async resolveDomain(@Query('domain') domain: string) {
        if (!domain) {
            throw new NotFoundException('Domain parameter is required');
        }
        return this.storefrontService.resolveByDomain(domain);
    }
}
