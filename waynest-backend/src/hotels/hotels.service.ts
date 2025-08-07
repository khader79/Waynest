import { Injectable } from '@nestjs/common';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Hotel } from './entities/hotel.entity';
import { Repository } from 'typeorm';

@Injectable()
export class HotelsService {
  constructor(@InjectRepository(Hotel) private hotelRepo: Repository<Hotel>) {}
  async create(createHotelDto: CreateHotelDto) {
    return this.hotelRepo.save(createHotelDto);
  }

  async findAll() {
    return await this.hotelRepo.find();
  }

  findOne(id: number) {
    return `This action returns a #${id} hotel`;
  }

  update(id: number, updateHotelDto: UpdateHotelDto) {
    return `This action updates a #${id} hotel`;
  }

  remove(id: number) {
    return `This action removes a #${id} hotel`;
  }
}
