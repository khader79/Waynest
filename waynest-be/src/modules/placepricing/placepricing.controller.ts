import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PlacepricingService } from './placepricing.service';
import { CreatePlacepricingDto } from './dto/create-placepricing.dto';
import { UpdatePlacepricingDto } from './dto/update-placepricing.dto';

@Controller('placepricing')
export class PlacepricingController {
  constructor(private readonly placepricingService: PlacepricingService) {}

  @Post()
  create(@Body() createPlacepricingDto: CreatePlacepricingDto) {
    return this.placepricingService.create(createPlacepricingDto);
  }

  @Get()
  findAll() {
    return this.placepricingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.placepricingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlacepricingDto: UpdatePlacepricingDto) {
    return this.placepricingService.update(+id, updatePlacepricingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.placepricingService.remove(+id);
  }
}
