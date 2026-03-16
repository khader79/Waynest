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
import { ProvidersService } from '../providers/providers.service';
import { SignUpDto } from './dto/signup.dto';
import { UserRole } from '../users/entities/user.entity';
import { EmailVerificationService } from '../email-verification/email-verification.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private providerService: ProvidersService,
    private emailVerificationService: EmailVerificationService,
  ) {}

  async signIn(loginDto: LoginDto) {
    const user = await this.usersService.findOneByEmailOrUsername(
      loginDto.identifier,
    );

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = bcrypt.compareSync(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) throw new UnauthorizedException('Wrong password');

    if (user.role !== 'ADMIN') {
      if (!user.isEmailVerified)
        throw new UnauthorizedException('Please verify your email first');
    }

    await this.usersService.updateLastLogin(user.id);

    const payload = {
      sub: user.id,
      email: user.email,
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
    if (existingEmail) throw new ConflictException('Email already exists');

    const existingUsername = await this.usersService.findByUsername(
      createUserDto.username,
    );
    if (existingUsername) throw new ConflictException('Username already taken');

    const user = await this.usersService.create(createUserDto);

    if (createUserDto.role === UserRole.PROVIDER) {
      if (!provider) throw new BadRequestException('Provider data is required');
      await this.providerService.create(provider, user);
    }
    if (user.role != 'ADMIN') {
      await this.emailVerificationService.sendVerificationEmail(user);
    }

    return { message: 'Check your email to verify your account' };
  }
}
