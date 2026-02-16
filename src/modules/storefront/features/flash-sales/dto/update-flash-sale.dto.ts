import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateFlashSaleDto } from './create-flash-sale.dto';

/**
 * DTO para actualizar una flash sale existente
 * Excluye items porque se gestionan por separado
 */
export class UpdateFlashSaleDto extends PartialType(
    OmitType(CreateFlashSaleDto, ['items'] as const),
) { }
