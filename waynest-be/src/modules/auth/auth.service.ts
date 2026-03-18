import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { ProvidersService } from '../providers/providers.service';
import { SignUpDto } from './dto/signup.dto';
import { UserRole } from '../users/entities/user.entity';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { MoreThan, Repository } from 'typeorm';
import { InviteToken } from './entities/invite-token.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private providerService: ProvidersService,
    private emailVerificationService: EmailVerificationService,
    @InjectRepository(InviteToken)
    private inviteTokenRepo: Repository<InviteToken>,
  ) {}

  async signIn(loginDto: LoginDto, deviceFingerprint?: string) {
    const user = await this.usersService.findOneByEmailOrUsername(
      loginDto.identifier,
    );

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = bcrypt.compareSync(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) throw new UnauthorizedException('Wrong password');

    if (user.role === UserRole.ADMIN) {
      if (!deviceFingerprint) {
        throw new UnauthorizedException('Device not allowed');
      }

      const allowedDevices = user.allowedDevices ?? [];

      // Allow first two unique devices automatically
      if (!allowedDevices.includes(deviceFingerprint)) {
        if (allowedDevices.length < 2) {
          await this.usersService.updateAllowedDevices(
            user.id,
            deviceFingerprint,
          );
        } else {
          // Already reached max devices and this one is new -> reject
          throw new UnauthorizedException('Device not allowed');
        }
      }
    } else if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    await this.usersService.updateLastLogin(user.id);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
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

  async createInviteToken(): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.inviteTokenRepo.save(
      this.inviteTokenRepo.create({ token, expiresAt }),
    );

    return { token, expiresAt };
  }

  async acceptInvite(token: string, fingerprint: string): Promise<void> {
    const record = await this.inviteTokenRepo.findOne({
      where: { token, isUsed: false, expiresAt: MoreThan(new Date()) },
    });

    if (!record) {
      throw new NotFoundException('Invite link is invalid or has expired.');
    }

    const existing = await this.getAdminDevices();
    if (existing.includes(fingerprint)) {
      await this.inviteTokenRepo.update(record.id, {
        isUsed: true,
        usedByFingerprint: fingerprint,
      });
      return;
    }

    await this.addAdminDevice(fingerprint);
    await this.inviteTokenRepo.update(record.id, {
      isUsed: true,
      usedByFingerprint: fingerprint,
    });
  }

  private async getAdminDevices(): Promise<string[]> {
    const admin = await this.usersService.findByUsername('admin');

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new NotFoundException('Admin account not found.');
    }

    return this.usersService.getAllowedDevices(admin.id);
  }

  private async addAdminDevice(fingerprint: string): Promise<string[]> {
    const admin = await this.usersService.findByUsername('admin');

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new NotFoundException('Admin account not found.');
    }

    return this.usersService.updateAllowedDevices(admin.id, fingerprint);
  }
}
