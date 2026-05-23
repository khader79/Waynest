import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ProviderMembership,
  ProviderRole,
} from './entities/provider-membership.entity';
import { CreateProviderMembershipDto } from './dto/create-provider-membership.dto';
import { UpdateProviderMembershipDto } from './dto/update-provider-membership.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { Provider } from '../providers/entities/provider.entity';

@Injectable()
export class ProviderMembershipService {
  constructor(
    @InjectRepository(ProviderMembership)
    private readonly repo: Repository<ProviderMembership>,
    private readonly usersService: UsersService,
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

  // Ensure owner membership creation also promotes the user role to PROVIDER
  async createOwnerMembershipAndPromote(user: User, provider: Provider) {
    const membership = await this.createOwnerMembership(user, provider);
    try {
      if (user.role !== UserRole.PROVIDER) {
        await this.usersService.update(user.id, { role: UserRole.PROVIDER });
      }
    } catch (err) {
      // If role update fails, still return membership; higher-level flows
      // should handle transactional consistency when needed.
    }

    return membership;
  }

  async createOwnerMembershipWithManager(
    manager: EntityManager,
    user: User,
    provider: Provider,
  ) {
    const repo = manager.getRepository(ProviderMembership);
    const existing = await repo.findOne({
      where: {
        user: { id: user.id },
        provider: { id: provider.id },
      },
    });

    if (existing) {
      return existing;
    }

    const membership = repo.create({
      user,
      provider,
      providerRole: ProviderRole.OWNER,
    });

    return await repo.save(membership);
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
