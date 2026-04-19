import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateBackorderDto {
    @IsUUID()
    orderId: string;

    @IsUUID()
    productId: string;

    @IsUUID()
    customerId: string;

    @IsInt()
    @Min(1)
    quantity: number;

    @IsOptional()
    @IsDateString()
    estimatedDate?: string;
}
