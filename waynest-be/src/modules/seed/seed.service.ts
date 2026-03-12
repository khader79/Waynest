import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { seedBethlehem, SeedBethlehemResult } from './bethlehem.seed';

@Injectable()
export class SeedService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  seedBethlehem(): Promise<SeedBethlehemResult> {
    return seedBethlehem(this.dataSource);
  }
}
