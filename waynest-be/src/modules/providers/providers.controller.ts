import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
  Body,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

type AuthRequest = {
  user: {
    sub: string;
    role: UserRole;
  };
};

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.providersService.findAll();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMy(@Request() req: AuthRequest) {
    return this.providersService.findByUser(req.user.sub);
  }

  @Get('my/places')
  @UseGuards(JwtAuthGuard)
  findMyPlaces(@Request() req: AuthRequest) {
    return this.providersService.findMyPlaces(req.user.sub);
  }

  @Get('my/events')
  @UseGuards(JwtAuthGuard)
  findMyEvents(@Request() req: AuthRequest) {
    return this.providersService.findMyEvents(req.user.sub);
  }

  @Get('my/stats')
  @UseGuards(JwtAuthGuard)
  async findMyStats(@Request() req: AuthRequest) {
    const provider = await this.providersService.findByUser(req.user.sub);
    return this.providersService.getStats(provider.id);
  }

  @Patch('my')
  @UseGuards(JwtAuthGuard)
  updateMy(
    @Request() req: AuthRequest,
    @Body() updateProviderDto: UpdateProviderDto,
  ) {
    return this.providersService.updateOwnProfile(
      req.user.sub,
      updateProviderDto,
    );
  }

  /** Public business page (uses slug, never UUID in URLs). */
  @Get('public/by-slug/:slug')
  findPublicBySlug(@Param('slug') slug: string) {
    return this.providersService.findPublicBySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProviderDto: UpdateProviderDto,
  ) {
    return this.providersService.update(id, updateProviderDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.providersService.remove(id);
  }
}
