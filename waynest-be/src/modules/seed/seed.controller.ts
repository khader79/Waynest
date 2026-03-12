import { Controller, Post } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedBethlehemResult } from './bethlehem.seed';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('bethlehem')
  seedBethlehem(): Promise<SeedBethlehemResult> {
    return this.seedService.seedBethlehem();
  }
}
