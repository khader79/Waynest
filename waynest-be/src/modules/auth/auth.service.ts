import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { ProvidersService } from '../providers/providers.service';
import { CreateProviderDto } from '../providers/dto/create-provider.dto';
import { SignUpDto } from './dto/signuo.dto';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private providerService: ProvidersService,
  ) {}

  async signIn(loginDto: LoginDto) {
    const user = await this.usersService.findOneByEmailOrUsername(
      loginDto.identifier,
    );

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const password = bcrypt.compareSync(loginDto.password, user.passwordHash);

    if (!password) throw new UnauthorizedException('Wrong Password');

    await this.usersService.updateLastLogin(user.id);

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async signUp(dto: SignUpDto) {
    const { provider, ...createUserDto } = dto;

    const existingEmail = await this.usersService.findByEmail(
      createUserDto.email,
    );
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingUsername = await this.usersService.findByUsername(
      createUserDto.username,
    );
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const user = await this.usersService.create(createUserDto);

    if (createUserDto.role === UserRole.PROVIDER) {
      if (!provider) {
        throw new BadRequestException('Provider data is required');
      }

      await this.providerService.create(provider, user);
    }

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    return {
      message: 'User created successfully',
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
