import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InviteMemberDto, UpdateMemberRoleDto, StoreRole } from './dto/team.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class TeamService {
    private readonly logger = new Logger(TeamService.name);

    constructor(private readonly prisma: PrismaService) { }

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
     * Get pending invitations for a store (sent by this store)
     */
    async getPendingInvitations(storeId: string) {
        const invitations = await this.prisma.storeInvitation.findMany({
            where: {
                storeId,
                status: 'PENDING',
            },
            include: {
                invitedBy: {
                    select: { firstName: true, lastName: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return invitations.map(inv => ({
            id: inv.id,
            email: inv.email,
            role: inv.role,
            message: inv.message,
            createdAt: inv.createdAt,
            invitedBy: `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`,
        }));
    }

    /**
     * Get MY pending invitations (invitations I received, for in-app flow)
     */
    async getMyPendingInvitations(userEmail: string) {
        const invitations = await this.prisma.storeInvitation.findMany({
            where: {
                email: userEmail.toLowerCase(),
                status: 'PENDING',
            },
            include: {
                store: {
                    select: { id: true, name: true, logo: true },
                },
                invitedBy: {
                    select: { firstName: true, lastName: true, avatar: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Serialización correcta: solo datos necesarios
        return invitations.map(inv => ({
            id: inv.id,
            store: {
                id: inv.store.id,
                name: inv.store.name,
                logo: inv.store.logo,
            },
            role: inv.role,
            message: inv.message,
            invitedBy: {
                name: `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`,
                avatar: inv.invitedBy.avatar,
            },
            createdAt: inv.createdAt,
        }));
    }

    /**
     * Respond to an invitation (accept or reject) - In-App Flow
     */
    async respondToInvitation(
        userId: string,
        userEmail: string,
        invitationId: string,
        action: 'accept' | 'reject',
    ) {
        // 1. Obtener invitación
        const invitation = await this.prisma.storeInvitation.findUnique({
            where: { id: invitationId },
            include: { store: true },
        });

        if (!invitation) {
            throw new NotFoundException('Invitación no encontrada');
        }

        // 2. Verificar que la invitación es para este usuario
        if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
            throw new ForbiddenException('Esta invitación no es para ti');
        }

        // 3. Verificar estado
        if (invitation.status !== 'PENDING') {
            throw new BadRequestException('Esta invitación ya fue respondida');
        }

        if (action === 'reject') {
            // Simplemente marcar como rechazada
            await this.prisma.storeInvitation.update({
                where: { id: invitationId },
                data: { status: 'REJECTED' },
            });

            this.logAction(invitation.storeId, userId, 'INVITATION_REJECTED', {
                invitationId,
            });

            return { message: 'Invitación rechazada' };
        }

        // 4. Verificar que no sea ya miembro
        const existingMember = await this.prisma.storeMember.findUnique({
            where: { userId_storeId: { userId, storeId: invitation.storeId } },
        });

        if (existingMember) {
            throw new ConflictException('Ya eres miembro de este equipo');
        }

        // 5. ACEPTAR: Crear StoreMember en transacción
        const [member] = await this.prisma.$transaction([
            this.prisma.storeMember.create({
                data: {
                    userId,
                    storeId: invitation.storeId,
                    role: invitation.role,
                },
            }),
            this.prisma.storeInvitation.update({
                where: { id: invitationId },
                data: {
                    status: 'ACCEPTED',
                    acceptedAt: new Date(),
                },
            }),
        ]);

        this.logAction(invitation.storeId, userId, 'INVITATION_ACCEPTED', {
            role: invitation.role,
        });

        return {
            message: 'Te has unido al equipo correctamente',
            storeId: member.storeId,
            storeName: invitation.store.name,
            role: member.role,
        };
    }


    /**
     * Invite a new member to the store
     */
    async inviteMember(storeId: string, inviterId: string, dto: InviteMemberDto) {
        // Check if email is already a member
        const existingMember = await this.prisma.storeMember.findFirst({
            where: {
                storeId,
                user: { email: dto.email },
            },
        });

        if (existingMember) {
            throw new ConflictException('Este usuario ya es miembro del equipo');
        }

        // Check if there's already a pending invitation
        const existingInvitation = await this.prisma.storeInvitation.findFirst({
            where: {
                storeId,
                email: dto.email,
                status: 'PENDING',
                expiresAt: { gt: new Date() },
            },
        });

        if (existingInvitation) {
            throw new ConflictException('Ya existe una invitación pendiente para este email');
        }

        // Create invitation - expires in 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitation = await this.prisma.storeInvitation.create({
            data: {
                storeId,
                email: dto.email,
                role: dto.role as any,
                token: randomUUID(),
                invitedById: inviterId,
                expiresAt,
            },
            include: {
                store: { select: { name: true } },
            },
        });

        this.logAction(storeId, inviterId, 'MEMBER_INVITED', {
            email: dto.email,
            role: dto.role,
        });

        return {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            inviteLink: `/ invite / ${invitation.token} `,
            expiresAt: invitation.expiresAt,
            storeName: invitation.store.name,
        };
    }

    /**
     * Verify invitation token (public)
     */
    async verifyInvitation(token: string) {
        const invitation = await this.prisma.storeInvitation.findUnique({
            where: { token },
            include: {
                store: { select: { id: true, name: true, logo: true } },
            },
        });

        if (!invitation) {
            throw new NotFoundException('Invitación no encontrada');
        }

        if (invitation.status !== 'PENDING') {
            throw new BadRequestException('Esta invitación ya fue utilizada o cancelada');
        }

        if (invitation.expiresAt < new Date()) {
            throw new BadRequestException('Esta invitación ha expirado');
        }

        return {
            valid: true,
            email: invitation.email,
            role: invitation.role,
            store: {
                id: invitation.store.id,
                name: invitation.store.name,
                logo: invitation.store.logo,
            },
        };
    }

    /**
     * Accept invitation and become a member
     */
    async acceptInvitation(token: string, userId: string) {
        const invitation = await this.prisma.storeInvitation.findUnique({
            where: { token },
            include: { store: true },
        });

        if (!invitation) {
            throw new NotFoundException('Invitación no encontrada');
        }

        if (invitation.status !== 'PENDING') {
            throw new BadRequestException('Esta invitación ya fue utilizada o cancelada');
        }

        if (invitation.expiresAt < new Date()) {
            throw new BadRequestException('Esta invitación ha expirado');
        }

        // Verify user email matches invitation
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
            throw new ForbiddenException('Esta invitación no es para tu cuenta');
        }

        // Check if already a member
        const existingMember = await this.prisma.storeMember.findUnique({
            where: { userId_storeId: { userId, storeId: invitation.storeId } },
        });

        if (existingMember) {
            throw new ConflictException('Ya eres miembro de este equipo');
        }

        // Create member and mark invitation as accepted
        const [member] = await this.prisma.$transaction([
            this.prisma.storeMember.create({
                data: {
                    userId,
                    storeId: invitation.storeId,
                    role: invitation.role,
                },
            }),
            this.prisma.storeInvitation.update({
                where: { id: invitation.id },
                data: {
                    status: 'ACCEPTED',
                    acceptedAt: new Date(),
                },
            }),
        ]);

        this.logAction(invitation.storeId, userId, 'MEMBER_JOINED', {
            role: invitation.role,
        });

        return {
            memberId: member.id,
            storeId: member.storeId,
            storeName: invitation.store.name,
            role: member.role,
        };
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
     * Cancel pending invitation
     */
    async cancelInvitation(storeId: string, requesterId: string, invitationId: string) {
        const invitation = await this.prisma.storeInvitation.findUnique({
            where: { id: invitationId },
        });

        if (!invitation || invitation.storeId !== storeId) {
            throw new NotFoundException('Invitación no encontrada');
        }

        if (invitation.status !== 'PENDING') {
            throw new BadRequestException('Esta invitación ya fue utilizada o cancelada');
        }

        await this.prisma.storeInvitation.update({
            where: { id: invitationId },
            data: { status: 'CANCELLED' },
        });

        this.logAction(storeId, requesterId, 'INVITATION_CANCELLED', {
            email: invitation.email,
            role: invitation.role,
        });

        return { message: 'Invitación cancelada' };
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
     * Log team actions for audit
     */
    async logAction(storeId: string, userId: string, action: string, metadata: any) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    storeId,
                    userId,
                    action,
                    entity: 'TEAM',
                    entityId: '0', // Default ID since we track team actions, not specific entity IDs always
                    newValues: metadata,
                    ipAddress: '127.0.0.1', // Placeholder for internal actions
                    userAgent: 'System',
                },
            });
            this.logger.log(`[AUDIT] ${action}`, { storeId, userId, ...metadata });
        } catch (error) {
            this.logger.error(`Failed to create audit log: ${error.message}`);
        }
    }
}
