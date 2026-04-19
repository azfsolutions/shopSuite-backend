import { IsOptional, IsString, MaxLength } from 'class-validator';

export class QuoteActionDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    note?: string;
}
