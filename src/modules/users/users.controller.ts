import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthGuard } from '../../core/guards';
import { CurrentUser } from '../../core/decorators';

@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    async getProfile(@CurrentUser('id') userId: string) {
        return this.usersService.findById(userId);
    }

    @Patch('me')
    @ApiOperation({ summary: 'Update current user profile' })
    async updateProfile(
        @CurrentUser('id') userId: string,
        @Body() data: { firstName?: string; lastName?: string; avatar?: string },
    ) {
        return this.usersService.updateProfile(userId, data);
    }

    @Get('me/stores')
    @ApiOperation({ summary: 'Get all stores for current user' })
    async getMyStores(@CurrentUser('id') userId: string) {
        return this.usersService.getUserStores(userId);
    }
}
