import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateWholesaleSettingsDto } from './dto/update-wholesale-settings.dto';

@Injectable()
export class WholesaleSettingsService {
    private readonly logger = new Logger(WholesaleSettingsService.name);

    constructor(private readonly prisma: PrismaService) {}

    async getOrCreate(storeId: string) {
        const existing = await this.prisma.wholesaleSettings.findUnique({
            where: { storeId },
        });
        if (existing) return existing;

        return this.prisma.wholesaleSettings.create({
            data: { storeId },
        });
    }

    async update(storeId: string, dto: UpdateWholesaleSettingsDto) {
        await this.getOrCreate(storeId);
        return this.prisma.wholesaleSettings.update({
            where: { storeId },
            data: dto,
        });
    }
}
