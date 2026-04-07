import { PartialType } from '@nestjs/mapped-types';
import { CreateProviderEventDto } from './create-provider-event.dto';

export class UpdateProviderEventDto extends PartialType(
  CreateProviderEventDto,
) {}
