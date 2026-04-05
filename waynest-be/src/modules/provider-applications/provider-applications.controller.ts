import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateProviderDto } from '../providers/dto/create-provider.dto';
import { ProviderApplicationsService } from './provider-applications.service';
import { RejectProviderApplicationDto } from './dto/reject-provider-application.dto';

type AuthRequest = {
  user: {
    sub: string;
    role: UserRole;
  };
};

@Controller('provider-applications')
export class ProviderApplicationsController {
  constructor(
    private readonly providerApplicationsService: ProviderApplicationsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.USER)
  submit(@Request() req: AuthRequest, @Body() dto: CreateProviderDto) {
    return this.providerApplicationsService.submit(req.user.sub, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: AuthRequest) {
    return this.providerApplicationsService.findMine(req.user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.providerApplicationsService.findAllForAdmin();
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  approve(@Param('id') id: string) {
    return this.providerApplicationsService.approve(id);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  reject(
    @Param('id') id: string,
    @Body() body: RejectProviderApplicationDto,
  ) {
    return this.providerApplicationsService.reject(id, body);
  }
}
