import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnsubscribeNewsletterDto {
    @ApiProperty()
    @IsEmail()
    email: string;
}
