import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TeamService } from './team.service';
import { InviteMemberDto, UpdateMemberRoleDto, RespondInvitationDto } from './dto/team.dto';
import { AuthGuard } from '../../core/guards';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { CurrentStore, CurrentUser, RequirePermission } from '../../core/decorators';
import { PERMISSIONS, ROLE_PERMISSIONS, PERMISSION_LABELS } from '../../config/permissions.config';

@ApiTags('team')
@Controller('team')
@UseGuards(AuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class TeamController {
    private readonly logger = new Logger(TeamController.name);
    constructor(private readonly teamService: TeamService) { }

    @Get()
    @RequirePermission(PERMISSIONS.TEAM_VIEW)
    @ApiOperation({ summary: 'Get all team members' })
    async getMembers(@CurrentStore('id') storeId: string) {
        this.logger.debug(`Getting members for store: ${storeId}`);
        return this.teamService.getMembers(storeId);
    }

    @Get('invitations')
    @RequirePermission(PERMISSIONS.TEAM_MANAGE)
    @ApiOperation({ summary: 'Get pending invitations (sent by this store)' })
    async getPendingInvitations(@CurrentStore('id') storeId: string) {
        return this.teamService.getPendingInvitations(storeId);
    }

    @Get('my-invitations')
    @ApiOperation({ summary: 'Get MY pending invitations (in-app flow)' })
    async getMyPendingInvitations(@CurrentUser('email') userEmail: string) {
        return this.teamService.getMyPendingInvitations(userEmail);
    }

    @Post('invitations/:invitationId/respond')
    @ApiOperation({ summary: 'Accept or reject an invitation (in-app flow)' })
    @ApiParam({ name: 'invitationId', description: 'Invitation ID' })
    async respondToInvitation(
        @CurrentUser('id') userId: string,
        @CurrentUser('email') userEmail: string,
        @Param('invitationId') invitationId: string,
        @Body() dto: RespondInvitationDto,
    ) {
        return this.teamService.respondToInvitation(userId, userEmail, invitationId, dto.action);
    }

    @Post('invite')
    @RequirePermission(PERMISSIONS.TEAM_MANAGE)
    @ApiOperation({ summary: 'Invite a new team member' })
    async inviteMember(
        @CurrentStore('id') storeId: string,
        @CurrentUser('id') userId: string,
        @Body() dto: InviteMemberDto,
    ) {
        return this.teamService.inviteMember(storeId, userId, dto);
    }

    @Get('invite/:token')
    @ApiOperation({ summary: 'Verify invitation token (legacy)' })
    @ApiParam({ name: 'token', description: 'Invitation token' })
    async verifyInvitation(@Param('token') token: string) {
        return this.teamService.verifyInvitation(token);
    }

    @Post('invite/:token/accept')
    @ApiOperation({ summary: 'Accept invitation via token (legacy)' })
    @ApiParam({ name: 'token', description: 'Invitation token' })
    async acceptInvitation(
        @Param('token') token: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.teamService.acceptInvitation(token, userId);
    }

    @Patch(':memberId')
    @RequirePermission(PERMISSIONS.TEAM_MANAGE)
    @ApiOperation({ summary: 'Update member role' })
    @ApiParam({ name: 'memberId', description: 'Member ID to update' })
    async updateMemberRole(
        @CurrentStore('id') storeId: string,
        @CurrentUser('id') requesterId: string,
        @Param('memberId') memberId: string,
        @Body() dto: UpdateMemberRoleDto,
    ) {
        return this.teamService.updateMemberRole(storeId, requesterId, memberId, dto);
    }

    @Delete(':memberId')
    @RequirePermission(PERMISSIONS.TEAM_MANAGE)
    @ApiOperation({ summary: 'Remove member from team' })
    @ApiParam({ name: 'memberId', description: 'Member ID to remove' })
    async removeMember(
        @CurrentStore('id') storeId: string,
        @CurrentUser('id') requesterId: string,
        @Param('memberId') memberId: string,
    ) {
        return this.teamService.removeMember(storeId, requesterId, memberId);
    }

    @Delete('invitations/:invitationId')
    @RequirePermission(PERMISSIONS.TEAM_MANAGE)
    @ApiOperation({ summary: 'Cancel pending invitation' })
    @ApiParam({ name: 'invitationId', description: 'Invitation ID to cancel' })
    async cancelInvitation(
        @CurrentStore('id') storeId: string,
        @CurrentUser('id') requesterId: string,
        @Param('invitationId') invitationId: string,
    ) {
        return this.teamService.cancelInvitation(storeId, requesterId, invitationId);
    }

    @Get('my-role')
    @ApiOperation({ summary: 'Get current user role in store' })
    async getMyRole(
        @CurrentStore('id') storeId: string,
        @CurrentUser('id') userId: string,
    ) {
        const role = await this.teamService.getUserRole(userId, storeId);
        return { role };
    }

    @Get('permissions')
    @ApiOperation({ summary: 'Get permissions matrix' })
    async getPermissionsMatrix() {
        return {
            permissions: PERMISSIONS,
            rolePermissions: ROLE_PERMISSIONS,
            labels: PERMISSION_LABELS,
        };
    }

    @Get('my-permissions')
    @ApiOperation({ summary: 'Get my permissions in current store' })
    async getMyPermissions(
        @CurrentStore('id') storeId: string,
        @CurrentUser('id') userId: string,
    ) {
        const role = await this.teamService.getUserRole(userId, storeId);
        if (!role) {
            return { permissions: [] };
        }
        return {
            role,
            permissions: ROLE_PERMISSIONS[role] || [],
        };
    }
}
