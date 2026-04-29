import {
    IsEmail,
    IsString,
    IsOptional,
    IsArray,
    IsInt,
    Min,
    ValidateNested,
    MaxLength,
    ArrayMinSize,
    ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingAddressDto {
    @IsString()
    @MaxLength(100)
    firstName: string;

    @IsString()
    @MaxLength(100)
    lastName: string;

    @IsString()
    @MaxLength(255)
    address1: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    address2?: string;

    @IsString()
    @MaxLength(100)
    city: string;

    @IsString()
    @MaxLength(100)
    state: string;

    @IsString()
    @MaxLength(20)
    postalCode: string;

    @IsString()
    @MaxLength(100)
    country: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;
}

export class OrderItemDto {
    @IsString()
    productId: string;

    @IsOptional()
    @IsString()
    variantId?: string;

    @IsInt()
    @Min(1)
    quantity: number;
}

export class CreateStorefrontOrderDto {
    @IsEmail()
    email: string;

    @IsString()
    @MaxLength(100)
    firstName: string;

    @IsString()
    @MaxLength(100)
    lastName: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    @ValidateNested()
    @Type(() => ShippingAddressDto)
    shippingAddress: ShippingAddressDto;

    @IsString()
    shippingMethodId: string;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(100)
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @IsOptional()
    @IsString()
    @MaxLength(50)
    couponCode?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    paymentMethod?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    customerNote?: string;
}
