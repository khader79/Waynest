import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Place } from '../place/entities/place.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly repo: Repository<Review>,
  ) {}

  async create(dto: CreateReviewDto) {
    const { place, user, ...rest } = dto;
    const review = this.repo.create({
      ...rest,
      place: { id: place } as Place,
      user: { id: user } as User,
    });
    return await this.repo.save(review);
  }

  async findAll() {
    return await this.repo.find({
      relations: ['place', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const review = await this.repo.findOne({
      where: { id },
      relations: ['place', 'user'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async update(id: string, dto: UpdateReviewDto) {
    const review = await this.findOne(id);
    const { place, user, ...rest } = dto;

    Object.assign(review, rest);

    if (place) {
      review.place = { id: place } as Place;
    }

    if (user) {
      review.user = { id: user } as User;
    }

    return await this.repo.save(review);
  }

  async remove(id: string) {
    const review = await this.findOne(id);
    return await this.repo.softDelete(review.id);
  }
}
