import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { CreateWishlistDto } from './dto/create-wishlist.dto';

export type WishlistItem = {
  id: string;
  placeId: string | null;
  createdAt: Date;
  place: {
    id: string;
    name: string;
    imageUrl: string | null;
    type: string;
    ratingAverage: number;
  } | null;
};

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly repo: Repository<Wishlist>,
  ) {}

  async add(userId: string, dto: CreateWishlistDto) {
    const existing = await this.repo.findOne({
      where: { userId, placeId: dto.placeId },
    });

    if (existing) {
      throw new ConflictException('Place already in wishlist');
    }

    const item = this.repo.create({
      userId,
      placeId: dto.placeId,
    });

    return await this.repo.save(item);
  }

  async remove(userId: string, placeId: string) {
    const existing = await this.repo.findOne({ where: { userId, placeId } });

    if (!existing) {
      throw new NotFoundException('Wishlist item not found');
    }

    await this.repo.remove(existing);

    return { success: true };
  }

  async findByUser(userId: string): Promise<WishlistItem[]> {
    const items = await this.repo.find({
      where: { userId },
      relations: { place: true },
      order: { createdAt: 'DESC' },
    });

    return items.map((item) => ({
      id: item.id,
      placeId: item.placeId,
      createdAt: item.createdAt,
      place: item.place
        ? {
            id: item.place.id,
            name: item.place.name,
            imageUrl: item.place.imageUrl ?? null,
            type: item.place.type,
            ratingAverage: item.place.ratingAverage,
          }
        : null,
    }));
  }

  async isInWishlist(userId: string, placeId: string) {
    const count = await this.repo.count({ where: { userId, placeId } });
    return count > 0;
  }
}
