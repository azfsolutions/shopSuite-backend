import { Injectable } from '@nestjs/common';
import { TeamMemberService } from './services/team-member.service';
import { InvitationService } from './services/invitation.service';
import { InviteMemberDto, UpdateMemberRoleDto, StoreRole } from './dto/team.dto';

/**
 * Facade that delegates to specialized sub-services.
 * Keeps the same public API so the controller doesn't change.
 */
@Injectable()
export class TeamService {
    constructor(
        private readonly members: TeamMemberService,
        private readonly invitations: InvitationService,
    ) {}

    // ── Member operations ───────────────────────────────────────

    getMembers(storeId: string) {
        return this.members.getMembers(storeId);
    }

    updateMemberRole(
        storeId: string,
        requesterId: string,
        memberId: string,
        dto: UpdateMemberRoleDto,
    ) {
        return this.members.updateMemberRole(storeId, requesterId, memberId, dto);
    }

    removeMember(storeId: string, requesterId: string, memberId: string) {
        return this.members.removeMember(storeId, requesterId, memberId);
    }

    getUserRole(userId: string, storeId: string): Promise<StoreRole | null> {
        return this.members.getUserRole(userId, storeId);
    }

    // ── Invitation operations ───────────────────────────────────

    getPendingInvitations(storeId: string) {
        return this.invitations.getPendingInvitations(storeId);
    }

    getMyPendingInvitations(userEmail: string) {
        return this.invitations.getMyPendingInvitations(userEmail);
    }

    respondToInvitation(
        userId: string,
        userEmail: string,
        invitationId: string,
        action: 'accept' | 'reject',
    ) {
        return this.invitations.respondToInvitation(userId, userEmail, invitationId, action);
    }

    inviteMember(storeId: string, inviterId: string, dto: InviteMemberDto) {
        return this.invitations.inviteMember(storeId, inviterId, dto);
    }

    verifyInvitation(token: string) {
        return this.invitations.verifyInvitation(token);
    }

    acceptInvitation(token: string, userId: string) {
        return this.invitations.acceptInvitation(token, userId);
    }

    cancelInvitation(storeId: string, requesterId: string, invitationId: string) {
        return this.invitations.cancelInvitation(storeId, requesterId, invitationId);
    }
}
