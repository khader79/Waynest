import { PartialType } from '@nestjs/mapped-types';
import { CreatePlacepricingDto } from './create-placepricing.dto';

export class UpdatePlacepricingDto extends PartialType(CreatePlacepricingDto) {}
