import { IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuoteItemDto {
    @IsUUID()
    productId: string;

    @IsInt()
    @Min(1)
    quantity: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    unitPrice: number;
}

export class CreateQuoteDto {
    @IsUUID()
    customerId: string;

    @IsDateString()
    validUntil: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    paymentTerms?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    deliveryTerms?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    notes?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuoteItemDto)
    items: QuoteItemDto[];
}
