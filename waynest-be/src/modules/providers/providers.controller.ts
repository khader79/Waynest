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
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthRequest = {
  user: {
    sub: string;
  };
};

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  create(@Body() createProviderDto: CreateProviderDto, @Body() user: User) {
    return this.providersService.create(createProviderDto, user);
  }

  @Get()
  findAll() {
    return this.providersService.findAll();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMy(@Request() req: AuthRequest) {
    return this.providersService.findByUser(req.user.sub);
  }

  @Get('my/stats')
  @UseGuards(JwtAuthGuard)
  async findMyStats(@Request() req: AuthRequest) {
    const provider = await this.providersService.findByUser(req.user.sub);
    return this.providersService.getStats(provider.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProviderDto: UpdateProviderDto,
  ) {
    return this.providersService.update(id, updateProviderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.providersService.remove(id);
  }
}
