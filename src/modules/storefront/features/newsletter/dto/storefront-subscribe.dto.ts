import { IsEmail, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StorefrontSubscribeDto {
    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty({ default: true })
    @IsBoolean()
    consentGiven: boolean;
}
