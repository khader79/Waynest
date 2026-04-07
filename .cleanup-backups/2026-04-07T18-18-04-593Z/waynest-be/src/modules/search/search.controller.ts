import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { SearchService } from './search.service';
import { GlobalSearchQueryDto } from './dto/global-search-query.dto';

type OptionalAuth = {
  user?: { sub: string };
};

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  global(@Request() req: OptionalAuth, @Query() query: GlobalSearchQueryDto) {
    return this.searchService.globalSearch(
      query.q ?? '',
      query.types,
      query.cityId,
      req.user?.sub,
      query.limit ?? 8,
    );
  }
}
