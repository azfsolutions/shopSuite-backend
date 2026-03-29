import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class BannerOrderItemDto {
    @ApiProperty()
    @IsString()
    id: string;

    @ApiProperty()
    @IsInt()
    @Min(0)
    order: number;
}

export class ReorderBannersDto {
    @ApiProperty({ type: [BannerOrderItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BannerOrderItemDto)
    bannerOrders: BannerOrderItemDto[];
}
