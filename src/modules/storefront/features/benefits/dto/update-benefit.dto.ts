import { PartialType } from '@nestjs/swagger';
import { CreateBenefitDto } from './create-benefit.dto';

/**
 * DTO para actualizar un benefit existente
 * Todos los campos son opcionales
 */
export class UpdateBenefitDto extends PartialType(CreateBenefitDto) { }
