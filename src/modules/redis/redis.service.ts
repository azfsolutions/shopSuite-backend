import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private readonly client: Redis;
    private _isAvailable = false;

    constructor() {
        this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6380', {
            enableOfflineQueue: false,
            maxRetriesPerRequest: 1,
            connectTimeout: 5000,
            lazyConnect: true,
        });

        this.client.on('connect', () => {
            this._isAvailable = true;
            this.logger.log('Redis connected');
        });

        this.client.on('ready', () => {
            this._isAvailable = true;
        });

        this.client.on('error', (err) => {
            this._isAvailable = false;
            this.logger.warn(`Redis error: ${err.message}`);
        });

        this.client.on('close', () => {
            this._isAvailable = false;
        });
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.client.connect();
        } catch (err) {
            this.logger.warn(`Redis initial connection failed: ${(err as Error).message}. Will retry automatically.`);
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.quit();
    }

    get isAvailable(): boolean {
        return this._isAvailable;
    }

    getClient(): Redis {
        return this.client;
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
            await this.client.set(key, value);
        }
    }

    async del(...keys: string[]): Promise<void> {
        if (keys.length > 0) {
            await this.client.del(...keys);
        }
    }

    async incr(key: string): Promise<number> {
        return this.client.incr(key);
    }

    async expire(key: string, ttlSeconds: number): Promise<void> {
        await this.client.expire(key, ttlSeconds);
    }

    async ping(): Promise<boolean> {
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        } catch {
            return false;
        }
    }
}
