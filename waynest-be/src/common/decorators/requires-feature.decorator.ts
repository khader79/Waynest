import { SetMetadata } from '@nestjs/common';

export const RequiresFeature = (featureKey: string) =>
  SetMetadata('requiredFeature', featureKey);
