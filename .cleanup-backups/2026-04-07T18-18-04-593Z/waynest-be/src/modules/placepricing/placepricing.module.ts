import { Module } from '@nestjs/common';
import { PlacepricingService } from './placepricing.service';
import { PlacepricingController } from './placepricing.controller';
import { PlacePricing } from './entities/placepricing.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([PlacePricing])],
  controllers: [PlacepricingController],
  providers: [PlacepricingService],
})
export class PlacepricingModule {}
