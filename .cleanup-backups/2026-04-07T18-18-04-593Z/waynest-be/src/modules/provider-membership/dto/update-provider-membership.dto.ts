import { PartialType } from '@nestjs/mapped-types';
import { CreateProviderMembershipDto } from './create-provider-membership.dto';

export class UpdateProviderMembershipDto extends PartialType(
  CreateProviderMembershipDto,
) {}
