import { Controller, Post, UseGuards } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedBethlehemResult } from './bethlehem.seed';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/modules/auth/guards/role.guard';
import { Roles } from 'src/modules/auth/roles.decorator';
import { UserRole } from 'src/modules/users/entities/user.entity';


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
