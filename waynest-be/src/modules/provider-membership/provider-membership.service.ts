import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProviderMembership,
  ProviderRole,
} from './entities/provider-membership.entity';
import { CreateProviderMembershipDto } from './dto/create-provider-membership.dto';
import { UpdateProviderMembershipDto } from './dto/update-provider-membership.dto';
import { User } from '../users/entities/user.entity';
import { Provider } from '../providers/entities/provider.entity';

@Injectable()
export class ProviderMembershipService {
  constructor(
    @InjectRepository(ProviderMembership)
    private readonly repo: Repository<ProviderMembership>,
  ) {}

  async create(dto: CreateProviderMembershipDto) {
    const membership = this.repo.create(dto);
    return await this.repo.save(membership);
  }

  async createOwnerMembership(user: User, provider: Provider) {
    const existing = await this.repo.findOne({
      where: {
        user: { id: user.id },
        provider: { id: provider.id },
      },
    });

    if (existing) return existing;

    const membership = this.repo.create({
      user,
      provider,
      providerRole: ProviderRole.OWNER,
    });

    return await this.repo.save(membership);
  }

  async findAll() {
    return await this.repo.find({
      relations: ['user', 'provider'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const membership = await this.repo.findOne({
      where: { id },
      relations: ['user', 'provider'],
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return membership;
  }

  async update(id: string, dto: UpdateProviderMembershipDto) {
    await this.repo.update(id, dto);
    return await this.findOne(id);
  }

  async remove(id: string) {
    const membership = await this.findOne(id);
    return await this.repo.softDelete(membership.id);
  }
}
