import { PartialType } from '@nestjs/mapped-types';
import { CreateCalendarEntryDto } from './create-calendar-entry.dto';

export class UpdateCalendarEntryDto extends PartialType(
  CreateCalendarEntryDto,
) {}
