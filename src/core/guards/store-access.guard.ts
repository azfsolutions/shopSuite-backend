import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StoreAccessGuard implements CanActivate {
    private readonly logger = new Logger(StoreAccessGuard.name);
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const request = context.switchToHttp().getRequest();
            const user = request.user;
            const storeId = request.params.storeId || request.headers['x-store-id'];

            this.logger.debug(`Checking access: storeId=${storeId}, userId=${user?.id}`);

            if (!storeId) {
                throw new ForbiddenException('Store ID is required');
            }

            if (!user) {
                throw new ForbiddenException('Authentication required');
            }

            // Check if store exists
            const store = await this.prisma.store.findUnique({
                where: { id: storeId },
                include: {
                    members: {
                        where: { userId: user.id },
                    },
                },
            });

            if (!store) {
                this.logger.warn(`Store not found: ${storeId}`);
                throw new NotFoundException('Tienda no encontrada');
            }

            // Check if user is owner or member
            const isOwner = store.ownerId === user.id;
            const isMember = store.members.length > 0;

            this.logger.debug(`Access check: isOwner=${isOwner}, isMember=${isMember}`);

            if (!isOwner && !isMember) {
                throw new ForbiddenException('No tienes acceso a esta tienda');
            }

            // Attach store and member info to request
            request.store = store;
            request.storeMember = isOwner
                ? { role: 'OWNER' }
                : store.members[0];

            this.logger.debug(`Access granted for userId=${user.id}`);
            return true;
        } catch (error) {
            if (error instanceof ForbiddenException || error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Unexpected error: ${error.message}`, error.stack);
            throw error;
        }
    }
}
