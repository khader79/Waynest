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
import { CreditEngineService } from '../credits/credit-engine.service';
import { Plan } from '../subscriptions/entities/plan.entity';
import {
  Subscription,
  SubscriptionStatus,
} from '../subscriptions/entities/subscription.entity';
import { CreditWallet } from '../credits/entities/credit-wallet.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { ActivateInviteDto } from './dto/activate-invite.dto';
import { InviteToken } from './entities/invite-token.entity';
import { UserRole } from '../users/entities/user.entity';
import { ProvidersService } from '../providers/providers.service';

type AvailableAccount = {
  type: 'personal' | 'provider';
  id: string;
  label: string;
  path: string;
  slug?: string | null;
  logoUrl?: string | null;
  coverPhotoUrl?: string | null;
};

type SessionUser = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  accounts: AvailableAccount[];
};

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailVerificationService: EmailVerificationService,
    @InjectRepository(InviteToken)
    private readonly inviteRepo: Repository<InviteToken>,
    @InjectRepository(Plan)
    private readonly plansRepo: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subsRepo: Repository<Subscription>,
    @InjectRepository(CreditWallet)
    private readonly walletsRepo: Repository<CreditWallet>,
    private creditEngine: CreditEngineService,
    private readonly providersService: ProvidersService,
  ) {}

  private async buildAvailableAccounts(user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  }): Promise<AvailableAccount[]> {
    const personalLabel =
      `${user.firstName} ${user.lastName}`.trim() || user.username;
    const accounts: AvailableAccount[] = [
      {
        type: 'personal',
        id: user.id,
        label: personalLabel,
        path: '/',
      },
    ];

    const ownedProvider = await this.providersService.findOwnedByUserId(
      user.id,
    );
    if (ownedProvider) {
      accounts.push({
        type: 'provider',
        id: ownedProvider.id,
        label: ownedProvider.displayName,
        path: '/account/provider',
        slug: ownedProvider.slug,
        logoUrl: ownedProvider.logoUrl ?? null,
        coverPhotoUrl: ownedProvider.coverPhotoUrl ?? null,
      });
    }

    return accounts;
  }

  private async buildSessionUser(user: {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  }): Promise<SessionUser> {
    return {
      ...user,
      accounts: await this.buildAvailableAccounts(user),
    };
  }

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
    const sessionUser = await this.buildSessionUser({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    return {
      access_token: accessToken,
      user: sessionUser,
    };
  }

  async getCurrentSessionUser(userId: string) {
    const user = await this.usersService.findMe(userId);
    return this.buildSessionUser(user);
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

    // Auto-create Free subscription + wallet with welcome credits
    await this.initializeFreeSubscription(user.id);

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

  private async initializeFreeSubscription(userId: string) {
    const freePlan = await this.plansRepo.findOne({
      where: { slug: 'free' },
    });
    if (!freePlan) {
      return;
    }

    const sub = this.subsRepo.create({
      user: { id: userId } as any,
      plan: freePlan,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await this.subsRepo.save(sub);

    await this.creditEngine.grant(
      userId,
      freePlan.monthlyCredits,
      { planId: freePlan.id, reason: 'registration' },
      'Welcome credits',
    );

    const wallet = await this.walletsRepo.findOne({
      where: { user: { id: userId } } as any,
    });
    if (wallet) {
      wallet.monthlyQuota = freePlan.monthlyCredits;
      await this.walletsRepo.save(wallet);
    }
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
