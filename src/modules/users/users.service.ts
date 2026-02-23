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
                phone: true,
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

    async updateProfile(id: string, data: { firstName?: string; lastName?: string; phone?: string; avatar?: string }) {
        const updateData: Record<string, string> = {};
        if (data.firstName !== undefined) updateData.firstName = data.firstName;
        if (data.lastName !== undefined) updateData.lastName = data.lastName;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.avatar !== undefined) updateData.avatar = data.avatar;

        if (data.firstName !== undefined || data.lastName !== undefined) {
            const current = await this.prisma.user.findUnique({
                where: { id },
                select: { firstName: true, lastName: true },
            });
            updateData.name = `${data.firstName ?? current?.firstName} ${data.lastName ?? current?.lastName}`;
        }

        return this.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
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
