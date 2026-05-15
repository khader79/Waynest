import { Controller, Post, UseGuards } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedBethlehemResult } from './bethlehem.seed';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/modules/auth/guards/role.guard';
import { Roles } from 'src/modules/auth/roles.decorator';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from 'src/modules/subscriptions/entities/plan.entity';

@Controller('seed')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(UserRole.ADMIN)
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('bethlehem')
  seedBethlehem(): Promise<SeedBethlehemResult> {
    return this.seedService.seedBethlehem();
  }

  @Post('subscriptions-setup')
  async setupSubscriptions() {
    // Admin-only route already guarded by class-level decorators
    // Use repositories via require to avoid circular DI in this simple seed endpoint
    const { AppDataSource } = require('../../src/common/data-source');
    const plansRepo = AppDataSource.getRepository(Plan);
    // Fallback: call internal seed helper with repos
    return this.seedService.setupSubscriptionPlans(plansRepo, null as never);
  }
}
