import { Injectable } from '@nestjs/common';
import { CreatePlacepricingDto } from './dto/create-placepricing.dto';
import { UpdatePlacepricingDto } from './dto/update-placepricing.dto';

@Injectable()
export class PlacepricingService {
  create(createPlacepricingDto: CreatePlacepricingDto) {
    return 'This action adds a new placepricing';
  }

  findAll() {
    return `This action returns all placepricing`;
  }

  findOne(id: number) {
    return `This action returns a #${id} placepricing`;
  }

  update(id: number, updatePlacepricingDto: UpdatePlacepricingDto) {
    return `This action updates a #${id} placepricing`;
  }

  remove(id: number) {
    return `This action removes a #${id} placepricing`;
  }
}
