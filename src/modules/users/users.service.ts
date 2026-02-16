import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true,
                globalRole: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        return user;
    }

    async updateProfile(id: string, data: { firstName?: string; lastName?: string; avatar?: string }) {
        return this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true,
                globalRole: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async getUserStores(userId: string) {
        const ownedStores = await this.prisma.store.findMany({
            where: { ownerId: userId, deletedAt: null },
            select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                status: true,
                createdAt: true,
            },
        });

        const memberStores = await this.prisma.storeMember.findMany({
            where: { userId },
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logo: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
        });

        return {
            owned: ownedStores,
            member: memberStores.map((m) => ({
                ...m.store,
                role: m.role,
            })),
        };
    }
}
