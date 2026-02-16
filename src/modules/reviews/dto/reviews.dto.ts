import { IsInt, IsString, IsOptional, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
    @ApiProperty({ example: 5, description: 'Rating de 1 a 5' })
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiPropertyOptional({ example: 'Excelente producto' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    title?: string;

    @ApiPropertyOptional({ example: 'Me encantó la calidad del producto, llegó muy rápido' })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    comment?: string;
}

export class ReplyReviewDto {
    @ApiProperty({ example: '¡Gracias por tu reseña! Nos alegra que te haya gustado.' })
    @IsString()
    @MaxLength(1000)
    reply: string;
}
