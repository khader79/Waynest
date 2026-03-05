import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderMembership, ProviderRole } from './entities/provider-membership.entity';
import { CreateProviderMembershipDto } from './dto/create-provider-membership.dto';
import { UpdateProviderMembershipDto } from './dto/update-provider-membership.dto';
import { User } from '../users/entities/user.entity';
import { Provider } from '../providers/entities/provider.entity';

@Injectable()
export class ProviderMembershipService {
  constructor(
    @InjectRepository(ProviderMembership)
    private readonly providerMembershipRepo: Repository<ProviderMembership>,
  ) {}

  async create(createProviderMembershipDto: CreateProviderMembershipDto) {
    const membership = this.providerMembershipRepo.create(
      createProviderMembershipDto,
    );
    return this.providerMembershipRepo.save(membership);
  }

  async createOwnerMembership(user: User, provider: Provider) {
    const existingMembership = await this.providerMembershipRepo.findOne({
      where: {
        user: { id: user.id },
        provider: { id: provider.id },
      },
    });

    if (existingMembership) {
      return existingMembership;
    }

    const membership = this.providerMembershipRepo.create({
      user,
      provider,
      providerRole: ProviderRole.OWNER,
    });

    return this.providerMembershipRepo.save(membership);
  }
  findAll() {
    return `This action returns all providerMembership`;
  }

  findOne(id: number) {
    return `This action returns a #${id} providerMembership`;
  }

  update(id: number, updateProviderMembershipDto: UpdateProviderMembershipDto) {
    return `This action updates a #${id} providerMembership`;
  }

  remove(id: number) {
    return `This action removes a #${id} providerMembership`;
  }
}
