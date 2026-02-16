import {
    IsEmail,
    IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para suscribirse al newsletter (público)
 */
export class SubscribeNewsletterDto {
    @ApiProperty({
        description: 'Email del suscriptor',
        example: 'cliente@example.com',
    })
    @IsEmail({}, { message: 'El email debe ser válido' })
    @IsNotEmpty({ message: 'El email es requerido' })
    email: string;
}
