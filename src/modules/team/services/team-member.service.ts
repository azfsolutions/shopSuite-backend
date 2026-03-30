import {
    Injectable,
    ForbiddenException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { UpdateMemberRoleDto, StoreRole } from '../dto/team.dto';

@Injectable()
export class TeamMemberService {
    private readonly logger = new Logger(TeamMemberService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
    ) {}

    /**
     * Get all members of a store
     */
    async getMembers(storeId: string) {
        const members = await this.prisma.storeMember.findMany({
            where: { storeId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        lastLoginAt: true,
                    },
                },
            },
            orderBy: [
                { role: 'asc' }, // OWNER first
                { createdAt: 'asc' },
            ],
        });

        const result = members.map(member => ({
            id: member.id,
            userId: member.userId,
            email: member.user.email,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            avatar: member.user.avatar,
            lastLoginAt: member.user.lastLoginAt,
            role: member.role,
            permissions: member.permissions,
            joinedAt: member.createdAt,
        }));

        this.logger.debug(`Found ${result.length} members for store ${storeId}`);
        return result;
    }

    /**
     * Update member role
     */
    async updateMemberRole(
        storeId: string,
        requesterId: string,
        memberId: string,
        dto: UpdateMemberRoleDto,
    ) {
        // Get requester's role
        const requester = await this.prisma.storeMember.findUnique({
            where: { userId_storeId: { userId: requesterId, storeId } },
        });

        if (!requester || !['OWNER', 'ADMIN'].includes(requester.role)) {
            throw new ForbiddenException('No tienes permiso para cambiar roles');
        }

        // Get target member
        const target = await this.prisma.storeMember.findUnique({
            where: { id: memberId },
            include: { user: { select: { email: true } } },
        });

        if (!target || target.storeId !== storeId) {
            throw new NotFoundException('Miembro no encontrado');
        }

        // Validations
        if (target.role === 'OWNER') {
            throw new ForbiddenException('No se puede modificar al propietario');
        }

        if (target.userId === requesterId) {
            throw new ForbiddenException('No puedes modificar tu propio rol');
        }

        if (requester.role === 'ADMIN' && target.role === 'ADMIN') {
            throw new ForbiddenException('Un ADMIN no puede modificar a otro ADMIN');
        }

        const previousRole = target.role;

        // Update role
        const updated = await this.prisma.storeMember.update({
            where: { id: memberId },
            data: { role: dto.role as any },
        });

        this.logAction(storeId, requesterId, 'MEMBER_ROLE_CHANGED', {
            memberId,
            email: target.user.email,
            previousRole,
            newRole: dto.role,
        });

        return {
            id: updated.id,
            role: updated.role,
            message: 'Rol actualizado correctamente',
        };
    }

    /**
     * Remove member from team
     */
    async removeMember(storeId: string, requesterId: string, memberId: string) {
        // Get requester's role
        const requester = await this.prisma.storeMember.findUnique({
            where: { userId_storeId: { userId: requesterId, storeId } },
        });

        if (!requester || !['OWNER', 'ADMIN'].includes(requester.role)) {
            throw new ForbiddenException('No tienes permiso para eliminar miembros');
        }

        // Get target member
        const target = await this.prisma.storeMember.findUnique({
            where: { id: memberId },
            include: { user: { select: { email: true } } },
        });

        if (!target || target.storeId !== storeId) {
            throw new NotFoundException('Miembro no encontrado');
        }

        // Validations
        if (target.role === 'OWNER') {
            throw new ForbiddenException('No se puede eliminar al propietario');
        }

        if (target.userId === requesterId) {
            throw new ForbiddenException('No puedes eliminarte a ti mismo');
        }

        if (requester.role === 'ADMIN' && target.role === 'ADMIN') {
            throw new ForbiddenException('Un ADMIN no puede eliminar a otro ADMIN');
        }

        // Delete member
        await this.prisma.storeMember.delete({
            where: { id: memberId },
        });

        this.logAction(storeId, requesterId, 'MEMBER_REMOVED', {
            email: target.user.email,
            role: target.role,
        });

        return { message: 'Miembro eliminado correctamente' };
    }

    /**
     * Get current user's role in a store
     */
    async getUserRole(userId: string, storeId: string): Promise<StoreRole | null> {
        const member = await this.prisma.storeMember.findUnique({
            where: { userId_storeId: { userId, storeId } },
        });

        return member?.role as StoreRole || null;
    }

    /**
     * Log team actions for audit (delegates to AuditService)
     */
    private async logAction(storeId: string, userId: string, action: string, metadata: any) {
        try {
            await this.audit.log({
                storeId,
                userId,
                action,
                entity: 'TEAM',
                entityId: '0',
                newValues: metadata,
                ipAddress: '127.0.0.1',
                userAgent: 'System',
            });
            this.logger.log(`[AUDIT] ${action}`, { storeId, userId, ...metadata });
        } catch (error) {
            this.logger.error(`Failed to create audit log: ${error.message}`);
        }
    }
}
