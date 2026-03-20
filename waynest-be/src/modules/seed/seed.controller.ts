import { Controller, Post, UseGuards } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedBethlehemResult } from './bethlehem.seed';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('seed')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(UserRole.ADMIN)
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('bethlehem')
  seedBethlehem(): Promise<SeedBethlehemResult> {
    return this.seedService.seedBethlehem();
  }
}
