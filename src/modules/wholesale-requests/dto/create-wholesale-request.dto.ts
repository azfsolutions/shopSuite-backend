import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWholesaleRequestDto {
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    initialMessage?: string;
}
