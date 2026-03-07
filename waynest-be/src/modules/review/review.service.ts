import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly repo: Repository<Review>,
  ) {}

  async create(dto: CreateReviewDto) {
    const review = this.repo.create(dto);
    return await this.repo.save(review);
  }

  async findAll() {
    return await this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const review = await this.repo.findOne({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async update(id: string, dto: UpdateReviewDto) {
    await this.repo.update(id, dto);
    return await this.findOne(id);
  }

  async remove(id: string) {
    const review = await this.findOne(id);
    return await this.repo.softDelete(review.id);
  }
}
