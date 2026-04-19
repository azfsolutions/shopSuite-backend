import { IsInt, Min } from 'class-validator';

export class FulfillBackorderDto {
    @IsInt()
    @Min(1)
    quantity: number;
}
