import { PartialType } from '@nestjs/swagger';
import { CreateTestimonialDto } from './create-testimonial.dto';

/**
 * DTO para actualizar un testimonial existente
 */
export class UpdateTestimonialDto extends PartialType(CreateTestimonialDto) { }
