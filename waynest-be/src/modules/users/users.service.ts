import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { ILike, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Booking } from '../bookings/entities/booking.entity';
import { Wishlist } from '../wishlist/entities/wishlist.entity';
import { Review, ReviewStatus } from '../review/entities/review.entity';
import { TripPlan } from 'src/trip-planner/entities/trip-planner.entity';
import { MediaService } from '../upload/media.service';

type SafeCurrentUser = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  preferredLanguage: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
};

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Wishlist)
    private readonly wishlistRepo: Repository<Wishlist>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(TripPlan)
    private readonly tripPlanRepo: Repository<TripPlan>,
    private readonly mediaService: MediaService,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeUsername(username: string) {
    return username.trim().toLowerCase();
  }

  private async seedAdmin() {
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();
    if (!adminPassword) {
      this.logger.log(
        'Skipping admin bootstrap because ADMIN_PASSWORD is not set.',
      );
      return;
    }

    const username = this.normalizeUsername(
      process.env.ADMIN_USERNAME?.trim() || 'admin',
    );
    const email = this.normalizeEmail(
      process.env.ADMIN_EMAIL?.trim() || 'admin@waynest.com',
    );
    const adminExists = await this.findByUsername(username);

    if (adminExists) return;

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const admin = this.userRepo.create({
      firstName: process.env.ADMIN_FIRST_NAME?.trim() || 'System',
      lastName: process.env.ADMIN_LAST_NAME?.trim() || 'Administrator',
      email,
      username,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: true,
      preferredLanguage: 'en',
      travelPreferences: {},
      failedLoginAttempts: 0,
    });
    await this.userRepo.save(admin);
    this.logger.log(`Bootstrapped admin account "${username}".`);
  }

  async create(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;
    const email = this.normalizeEmail(userData.email);
    const username = this.normalizeUsername(userData.username);

    const existingEmail = await this.findByEmail(email);
    if (existingEmail) {
      throw new BadRequestException('Email already exists');
    }

    const existingUsername = await this.findByUsername(username);
    if (existingUsername) {
      throw new BadRequestException('Username already taken');
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser = this.userRepo.create({
      ...userData,
      email,
      username,
      passwordHash,
    });

    return await this.userRepo.save(newUser);
  }

  async findAll(includeDeleted = false) {
    return await this.userRepo.find({
      withDeleted: includeDeleted,
    });
  }

  async findOne(id: string) {
    const user = await this.findCurrentUserRecord(id, true);

    if (!user) {
      throw new NotFoundException('User not found in our system');
    }

    if (user.deletedAt) {
      throw new BadRequestException(
        'This account has been deleted/deactivated',
      );
    }

    const safeUser = { ...user };
    delete safeUser.deletedAt;
    return safeUser;
  }

  async findMe(id: string): Promise<SafeCurrentUser> {
    const user = await this.findCurrentUserRecord(id, false);

    if (!user) {
      throw new NotFoundException('User not found in our system');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      avatarUrl: this.mediaService.publicUploadRef(user.avatarUrl),
      preferredLanguage: user.preferredLanguage,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
    };
  }

  async getMeSummary(userId: string) {
    const [bookingsCount, wishlistCount, reviewsCount, savedPlansCount] =
      await Promise.all([
        this.bookingRepo.count({ where: { userId } }),
        this.wishlistRepo.count({ where: { userId } }),
        this.reviewRepo.count({
          where: { userId, status: ReviewStatus.APPROVED },
        }),
        this.tripPlanRepo.count({ where: { userId } }),
      ]);

    return {
      bookingsCount,
      wishlistCount,
      reviewsCount,
      savedPlansCount,
    };
  }

  async findOneByEmailOrUsername(identifier: string) {
    const normalizedIdentifier = identifier.trim();

    return await this.userRepo.findOne({
      where: [
        { username: ILike(this.normalizeUsername(normalizedIdentifier)) },
        { email: this.normalizeEmail(normalizedIdentifier) },
      ],
      select: [
        'id',
        'email',
        'username',
        'passwordHash',
        'role',
        'firstName',
        'lastName',
        'isEmailVerified',
        'allowedDevices',
      ],
    });
  }

  async findByEmail(email: string) {
    return await this.userRepo.findOne({
      where: { email: this.normalizeEmail(email) },
    });
  }

  async findByUsername(username: string) {
    return await this.userRepo.findOne({
      where: { username: ILike(this.normalizeUsername(username)) },
    });
  }

  async updateLastLogin(userId: string) {
    return await this.userRepo.update(userId, {
      lastLogin: new Date(),
    });
  }

  async getAllowedDevices(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'allowedDevices'],
    });

    if (!user) {
      throw new NotFoundException('User not found in our system');
    }

    return user.allowedDevices ?? [];
  }

  async updateAllowedDevices(userId: string, fingerprint: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'allowedDevices'],
    });

    if (!user) {
      throw new NotFoundException('User not found in our system');
    }

    const allowedDevices = user.allowedDevices ?? [];

    if (!allowedDevices.includes(fingerprint)) {
      allowedDevices.push(fingerprint);
      user.allowedDevices = allowedDevices;
      await this.userRepo.save(user);
    }

    return allowedDevices;
  }

  async removeAllowedDevice(userId: string, fingerprint: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'allowedDevices'],
    });

    if (!user) {
      throw new NotFoundException('User not found in our system');
    }

    const allowedDevices = (user.allowedDevices ?? []).filter(
      (item) => item !== fingerprint,
    );
    user.allowedDevices = allowedDevices;
    await this.userRepo.save(user);

    return allowedDevices;
  }

  async update(id: string, updateUserDto: UpdateUserDto | UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found in our system');

    const { password, ...rest } = updateUserDto as UpdateUserDto;
    const fields = rest as Omit<UpdateUserDto, 'password'>;
    if (fields.email) {
      const normalizedEmail = this.normalizeEmail(fields.email);
      const existingEmail = await this.findByEmail(normalizedEmail);
      if (existingEmail && existingEmail.id !== id) {
        throw new BadRequestException('Email already exists');
      }
      fields.email = normalizedEmail;
    }

    if (fields.username) {
      const normalizedUsername = this.normalizeUsername(fields.username);
      const existingUsername = await this.findByUsername(normalizedUsername);
      if (existingUsername && existingUsername.id !== id) {
        throw new BadRequestException('Username already taken');
      }
      fields.username = normalizedUsername;
    }

    if (typeof fields.avatarUrl === 'string') {
      const trimmed = fields.avatarUrl.trim();
      const asUpload = this.mediaService.toRelativeUploadPath(trimmed);
      fields.avatarUrl = asUpload ?? trimmed;
    }

    Object.assign(user, fields);

    if (password) {
      user.passwordHash = bcrypt.hashSync(password, 10);
    }

    return await this.userRepo.save(user);
  }

  async remove(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return await this.userRepo.softDelete(id);
  }

  async markEmailAsVerified(userId: string) {
    await this.userRepo.update(userId, { isEmailVerified: true });
  }

  private async findCurrentUserRecord(id: string, withDeleted: boolean) {
    return this.userRepo.findOne({
      where: { id },
      withDeleted,
      select: [
        'id',
        'email',
        'username',
        'role',
        'firstName',
        'lastName',
        'phone',
        'avatarUrl',
        'preferredLanguage',
        'isEmailVerified',
        'isPhoneVerified',
        'deletedAt',
      ],
    });
  }
}
