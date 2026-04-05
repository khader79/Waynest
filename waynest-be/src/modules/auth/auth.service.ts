import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { ActivateInviteDto } from './dto/activate-invite.dto';
import { InviteToken } from './entities/invite-token.entity';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailVerificationService: EmailVerificationService,
    @InjectRepository(InviteToken)
    private readonly inviteRepo: Repository<InviteToken>,
  ) {}

  async login(loginDto: LoginDto) {
    const rawIdentifier =
      loginDto.identifier ?? loginDto.email ?? loginDto.username;
    const identifier = rawIdentifier?.trim();

    if (!identifier) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.usersService.findOneByEmailOrUsername(identifier);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    };

    await this.usersService.updateLastLogin(user.id);

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const normalizedEmail = registerDto.email.trim().toLowerCase();
    const normalizedUsername = this.normalizeUsername(registerDto.username);

    const existingEmail = await this.usersService.findByEmail(normalizedEmail);
    if (existingEmail) {
      throw new BadRequestException('Email already exists');
    }

    const existingUsername =
      await this.usersService.findByUsername(normalizedUsername);
    if (existingUsername) {
      throw new BadRequestException('Username already taken');
    }

    const user = await this.usersService.create({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: normalizedEmail,
      password: registerDto.password,
      username: normalizedUsername,
      role: UserRole.USER,
    });

    await this.emailVerificationService.sendVerificationEmail(user);

    return {
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  // ── Invite System ────────────────────────────────────────────────────────

  async createInvite(dto: CreateInviteDto) {
    const expiryDays = dto.expiryDays ?? 7;
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const invite = this.inviteRepo.create({ token, expiresAt });
    await this.inviteRepo.save(invite);

    return { token, expiresAt };
  }

  async activateInvite(dto: ActivateInviteDto) {
    const invite = await this.inviteRepo.findOne({
      where: { token: dto.token },
    });

    if (!invite) {
      throw new NotFoundException('Invite token not found');
    }
    if (invite.isUsed) {
      throw new BadRequestException('Invite token has already been used');
    }
    if (new Date() > invite.expiresAt) {
      throw new BadRequestException('Invite token has expired');
    }

    invite.isUsed = true;
    if (dto.fingerprint) {
      invite.usedByFingerprint = dto.fingerprint;
    }
    await this.inviteRepo.save(invite);

    return { message: 'Invite activated successfully' };
  }

  async validateInvite(token: string): Promise<boolean> {
    const invite = await this.inviteRepo.findOne({ where: { token } });
    return Boolean(invite && !invite.isUsed && new Date() <= invite.expiresAt);
  }

  private normalizeUsername(username: string) {
    return username.trim().toLowerCase();
  }

  private isBcryptHash(value: string) {
    return /^\$2[aby]\$/.test(value);
  }
}
