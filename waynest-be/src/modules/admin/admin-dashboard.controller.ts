import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/modules/auth/guards/role.guard';
import { Roles } from 'src/modules/auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminDashboardController {
  constructor(private dashboard: AdminDashboardService) {}

  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.dashboard.getStats();
  }
}
