import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CreateProviderPlaceDto } from './dto/create-provider-place.dto';
import { UpdateProviderPlaceDto } from './dto/update-provider-place.dto';
import { CreateProviderEventDto } from './dto/create-provider-event.dto';
import { UpdateProviderEventDto } from './dto/update-provider-event.dto';
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

  @Post('my/places')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.PROVIDER)
  createMyPlace(
    @Request() req: AuthRequest,
    @Body() dto: CreateProviderPlaceDto,
  ) {
    return this.providersService.createMyPlace(req.user.sub, dto);
  }

  @Patch('my/places/:placeId')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.PROVIDER)
  updateMyPlace(
    @Request() req: AuthRequest,
    @Param('placeId') placeId: string,
    @Body() dto: UpdateProviderPlaceDto,
  ) {
    return this.providersService.updateMyPlace(req.user.sub, placeId, dto);
  }

  @Post('my/events')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.PROVIDER)
  createMyEvent(
    @Request() req: AuthRequest,
    @Body() dto: CreateProviderEventDto,
  ) {
    return this.providersService.createMyEvent(req.user.sub, dto);
  }

  @Patch('my/events/:eventId')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.PROVIDER)
  updateMyEvent(
    @Request() req: AuthRequest,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateProviderEventDto,
  ) {
    return this.providersService.updateMyEvent(req.user.sub, eventId, dto);
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

  /** Full public profile bundle: listings, events, stats, reviews (slug or provider UUID). */
  @Get('public/profile/:param')
  findPublicProfile(@Param('param') param: string) {
    return this.providersService.findPublicProfileAggregate(param);
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
