import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { AuthGuard } from '../../core/guards';

@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('wishlist')
export class WishlistController {
    constructor(private readonly wishlistService: WishlistService) { }

    @Get()
    @ApiOperation({ summary: 'Obtener mi wishlist' })
    @ApiResponse({ status: 200, description: 'Wishlist con items' })
    getWishlist(@Request() req: any) {
        // El userId se usa para buscar el customer asociado
        return this.wishlistService.getWishlistByUserId(req.user.id);
    }

    @Post(':productId')
    @ApiOperation({ summary: 'Agregar producto a wishlist' })
    @ApiResponse({ status: 201, description: 'Producto agregado' })
    addItem(
        @Request() req: any,
        @Param('productId') productId: string,
    ) {
        return this.wishlistService.addItemByUserId(req.user.id, productId);
    }

    @Delete(':productId')
    @ApiOperation({ summary: 'Remover producto de wishlist' })
    @ApiResponse({ status: 200, description: 'Producto removido' })
    removeItem(
        @Request() req: any,
        @Param('productId') productId: string,
    ) {
        return this.wishlistService.removeItemByUserId(req.user.id, productId);
    }

    @Get('check/:productId')
    @ApiOperation({ summary: 'Verificar si producto está en wishlist' })
    @ApiResponse({ status: 200, description: 'Estado de wishlist' })
    async checkItem(
        @Request() req: any,
        @Param('productId') productId: string,
    ) {
        const isInWishlist = await this.wishlistService.isInWishlistByUserId(req.user.id, productId);
        return { inWishlist: isInWishlist };
    }

    @Get('count')
    @ApiOperation({ summary: 'Obtener cantidad de items en wishlist' })
    @ApiResponse({ status: 200, description: 'Cantidad de items' })
    async getCount(@Request() req: any) {
        const count = await this.wishlistService.getWishlistCountByUserId(req.user.id);
        return { count };
    }
}
