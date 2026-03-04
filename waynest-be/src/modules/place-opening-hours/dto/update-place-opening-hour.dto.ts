import { PartialType } from '@nestjs/mapped-types';
import { CreatePlaceOpeningHourDto } from './create-place-opening-hour.dto';

export class UpdatePlaceOpeningHourDto extends PartialType(CreatePlaceOpeningHourDto) {}
