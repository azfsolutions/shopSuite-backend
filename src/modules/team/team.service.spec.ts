import { Test, TestingModule } from '@nestjs/testing';
import { TeamService } from './team.service';
import { TeamMemberService } from './services/team-member.service';
import { InvitationService } from './services/invitation.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';
import { createMockUser, createMockStore } from '../../test/test-helpers';

const mockAuditService = { log: jest.fn() };

describe('TeamService', () => {
    let service: TeamService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TeamService,
                TeamMemberService,
                InvitationService,
                { provide: PrismaService, useValue: prisma },
                { provide: AuditService, useValue: mockAuditService },
            ],
        }).compile();

        service = module.get<TeamService>(TeamService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('getMembers', () => {
        it('should return store members with user info', async () => {
            const store = createMockStore({ ownerId: 'user-1' });
            prisma.store.findUnique.mockResolvedValue(store);
            prisma.storeMember.findMany.mockResolvedValue([
                { id: 'mem-1', userId: 'user-1', role: 'OWNER', status: 'ACTIVE', user: createMockUser() },
            ]);

            const result = await service.getMembers('store-1');

            expect(result).toHaveLength(1);
            expect(result[0].role).toBe('OWNER');
        });
    });

    describe('inviteMember', () => {
        it('should throw if inviting with existing member email', async () => {
            prisma.store.findUnique.mockResolvedValue(createMockStore());
            prisma.user.findUnique.mockResolvedValue(createMockUser());
            prisma.storeMember.findFirst.mockResolvedValue({ id: 'existing' });

            await expect(
                service.inviteMember('store-1', 'user-1', { email: 'user@test.com', role: 'ADMIN' } as any),
            ).rejects.toThrow();
        });
    });

    describe('getUserRole', () => {
        it('should return member role in store', async () => {
            const mockMember = { role: 'ADMIN' };
            prisma.storeMember.findUnique.mockResolvedValue(mockMember as any);

            const role = await service.getUserRole('user-1', 'store-1');
            expect(role).toBe('ADMIN');
        });

        it('should return null when not a member', async () => {
            prisma.storeMember.findUnique.mockResolvedValue(null);

            const role = await service.getUserRole('user-1', 'store-1');
            expect(role).toBeNull();
        });
    });

    describe('logAction', () => {
        it('should create audit log entry', async () => {
            prisma.auditLog.create.mockResolvedValue({});

            await (service as any).logAction('store-1', 'user-1', 'INVITE_MEMBER', { email: 'new@test.com' });

            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        storeId: 'store-1',
                        userId: 'user-1',
                        action: 'INVITE_MEMBER',
                    }),
                }),
            );
        });
    });
});
