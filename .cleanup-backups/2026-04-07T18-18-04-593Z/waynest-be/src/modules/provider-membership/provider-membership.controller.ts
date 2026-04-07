import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ProviderMembershipService } from './provider-membership.service';
import { CreateProviderMembershipDto } from './dto/create-provider-membership.dto';
import { UpdateProviderMembershipDto } from './dto/update-provider-membership.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('provider-membership')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(UserRole.ADMIN)
export class ProviderMembershipController {
  constructor(
    private readonly providerMembershipService: ProviderMembershipService,
  ) {}

  @Post()
  create(@Body() createProviderMembershipDto: CreateProviderMembershipDto) {
    return this.providerMembershipService.create(createProviderMembershipDto);
  }

  @Get()
  findAll() {
    return this.providerMembershipService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.providerMembershipService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProviderMembershipDto: UpdateProviderMembershipDto,
  ) {
    return this.providerMembershipService.update(
      id,
      updateProviderMembershipDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.providerMembershipService.remove(id);
  }
}
