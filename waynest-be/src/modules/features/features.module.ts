import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureAccess } from './entities/feature-access.entity';
import { FeaturesService } from './features.service';
import { FeatureGuard } from './guards/feature.guard';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureAccess])],
  providers: [FeaturesService, FeatureGuard],
  exports: [FeaturesService, FeatureGuard],
})
export class FeaturesModule {}
