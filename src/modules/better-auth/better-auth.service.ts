import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { createAuthInstance, type Auth } from '../../lib/auth';

@Injectable()
export class BetterAuthService {
    private readonly logger = new Logger(BetterAuthService.name);
    private _authInstance: Auth | null = null;

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) {}

    get auth(): Auth {
        if (!this._authInstance) {
            const redisClient = this.redis.isAvailable ? this.redis.getClient() : undefined;
            this._authInstance = createAuthInstance(this.prisma, redisClient);
            this.logger.log(
                redisClient
                    ? 'Better Auth initialized with Redis secondary storage'
                    : 'Better Auth initialized without Redis (DB-only mode)',
            );
        }
        return this._authInstance;
    }

    get api() {
        return this.auth.api;
    }
}
