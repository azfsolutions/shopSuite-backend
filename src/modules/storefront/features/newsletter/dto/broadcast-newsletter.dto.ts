import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BroadcastNewsletterDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    subject: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(10000)
    message: string;
}
