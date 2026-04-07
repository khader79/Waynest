import { PartialType } from '@nestjs/mapped-types';
import { CreateTripPlannerDto } from './create-trip-planner.dto';

export class UpdateTripPlannerDto extends PartialType(CreateTripPlannerDto) {}
