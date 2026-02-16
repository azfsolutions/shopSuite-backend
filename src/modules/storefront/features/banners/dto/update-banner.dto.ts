import { PartialType } from '@nestjs/swagger';
import { CreateBannerDto } from './create-banner.dto';

/**
 * DTO para actualizar un banner existente
 * Todos los campos son opcionales
 */
export class UpdateBannerDto extends PartialType(CreateBannerDto) { }
