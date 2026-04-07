import { PartialType } from '@nestjs/mapped-types';
import { CreateProviderPlaceDto } from './create-provider-place.dto';

export class UpdateProviderPlaceDto extends PartialType(
  CreateProviderPlaceDto,
) {}
