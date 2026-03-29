import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateExclusiveDto {
    @ApiProperty()
    @IsBoolean()
    isExclusive: boolean;
}
