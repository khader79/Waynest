import {
  ForbiddenException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddDeviceDto } from './dto/add-device.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './entities/user.entity';
import { RoleGuard } from '../auth/guards/role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthRequest = {
  user: {
    sub: string;
    role: UserRole;
  };
};

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Self (me) endpoints ──────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get own profile' })
  @UseGuards(JwtAuthGuard)
  @Get('me/summary')
  getMeSummary(@Request() req: AuthRequest) {
    return this.usersService.getMeSummary(req.user.sub);
  }

  @ApiOperation({ summary: 'Get own profile' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: AuthRequest) {
    return this.usersService.findMe(req.user.sub);
  }

  @ApiOperation({ summary: 'Update own profile (name, phone, password, avatar)' })
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Request() req: AuthRequest, @Body() dto: UpdateProfileDto) {
    return this.usersService.update(req.user.sub, dto);
  }

  // ── Device management ───────────────────────────────────────────────────

  @ApiOperation({ summary: 'List allowed devices for current user' })
  @UseGuards(JwtAuthGuard)
  @Get('allowed-devices')
  getAllowedDevices(@Request() req: AuthRequest) {
    return this.usersService.getAllowedDevices(req.user.sub);
  }

  @ApiOperation({ summary: 'Add a trusted device fingerprint' })
  @UseGuards(JwtAuthGuard)
  @Post('allowed-devices')
  addDevice(@Request() req: AuthRequest, @Body() dto: AddDeviceDto) {
    return this.usersService.updateAllowedDevices(req.user.sub, dto.fingerprint);
  }

  @ApiOperation({ summary: 'Remove a trusted device fingerprint' })
  @UseGuards(JwtAuthGuard)
  @Delete('allowed-devices/:fingerprint')
  removeDevice(
    @Request() req: AuthRequest,
    @Param('fingerprint') fingerprint: string,
  ) {
    return this.usersService.removeAllowedDevice(req.user.sub, fingerprint);
  }

  // ── Admin endpoints ──────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Create a user (Admin only)' })
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @ApiOperation({ summary: 'List all users (Admin only)' })
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll(@Query('includeDeleted') includeDeleted?: string) {
    return this.usersService.findAll(includeDeleted === 'true');
  }

  @ApiOperation({ summary: 'Get user profile by ID (self or admin)' })
  @UseGuards(JwtAuthGuard)
  @Get('profile/:id')
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    const isSelf = req.user.sub === id;
    const isAdmin = req.user.role === UserRole.ADMIN;

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    return this.usersService.findOne(id);
  }

  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @ApiOperation({ summary: 'Delete user by ID (Admin only)' })
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
