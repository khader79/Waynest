import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Inject,
  Optional,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { EntityManager, Raw, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Booking } from '../bookings/entities/booking.entity';
import { Wishlist } from '../wishlist/entities/wishlist.entity';
import { Review, ReviewStatus } from '../review/entities/review.entity';
import { TripPlan } from '../../trip-planner/entities/trip-planner.entity';
import { MediaService } from '../upload/media.service';
import { FriendshipService } from '../social-graph/friendship.service';
import { HotPathCache } from '../../common/utils/hot-path-cache';
import { REDIS_CLIENT_TOKEN } from '../../common/redis/redis.module';

type SafeCurrentUser = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  friendsCount: number;
};

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);
  private readonly readCache: HotPathCache;

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
    private readonly friendshipService: FriendshipService,
    private readonly mediaService: MediaService,

    @Optional()
    @Inject(REDIS_CLIENT_TOKEN)
    redisClient?: any,
  ) {
    this.readCache = new HotPathCache(100, redisClient || undefined);
  }

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
    const username = this.normalizeUsername(
      process.env.ADMIN_USERNAME?.trim() || 'admin',
    );
    const email = this.normalizeEmail(
      process.env.ADMIN_EMAIL?.trim() || 'admin@waynest.com',
    );
    const adminPassword = process.env.ADMIN_PASSWORD?.trim() || 'admin123456';
    const adminExists =
      (await this.findByUsername(username)) || (await this.findByEmail(email));
    if (!process.env.ADMIN_PASSWORD?.trim()) {
      this.logger.warn(
        `ADMIN_PASSWORD is not set. Bootstrapping admin "${username}" with fallback password "${adminPassword}".`,
      );
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const admin = this.userRepo.create({
      ...(adminExists ?? {}),
      firstName: process.env.ADMIN_FIRST_NAME?.trim() || 'System',
      lastName: process.env.ADMIN_LAST_NAME?.trim() || 'Administrator',
      email,
      username,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: true,
      isSearchVisible: true,
      allowedDevices: [],
      failedLoginAttempts: 0,
    });
    await this.userRepo.save(admin);
    this.logger.log(
      `${adminExists ? 'Updated' : 'Bootstrapped'} admin account "${username}".`,
    );
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

    this.readCache.deleteByPrefix('users:profile');
    return await this.userRepo.save(newUser);
  }

  async findAll(includeDeleted = false) {
    return await this.userRepo.find({
      withDeleted: includeDeleted,
    });
  }

  async findOne(id: string) {
    const cacheKey = `users:profile:${id}:withDeleted`;
    const ttlMs = 10_000; // 10 seconds

    return this.readCache.getOrSet(cacheKey, ttlMs, async () => {
      const user = await this.findCurrentUserRecord(id, true);

      if (!user) {
        throw new NotFoundException('User not found in our system');
      }

      if (user.deletedAt) {
        throw new BadRequestException(
          'This account has been deleted/deactivated',
        );
      }

      const safeUser: any = { ...user };
      delete safeUser.deletedAt;

      try {
        const friendsCount = await this.friendshipService.countAcceptedFriends(
          user.id,
        );
        safeUser.friendsCount = friendsCount;
      } catch (err) {
        if (process.env.DEBUG_FRIENDS === 'true') {
          // eslint-disable-next-line no-console
          console.log(
            '[DEBUG] UsersService.findOne error counting friends',
            err,
          );
        }
        safeUser.friendsCount = 0;
      }

      return safeUser;
    });
  }

  async findMe(id: string): Promise<SafeCurrentUser> {
    const cacheKey = `users:profile:${id}:current`;
    const ttlMs = 10_000; // 10 seconds

    return this.readCache.getOrSet(cacheKey, ttlMs, async () => {
      const user = await this.findCurrentUserRecord(id, false);

      if (!user) {
        throw new NotFoundException('User not found in our system');
      }

      let friendsCount = 0;
      try {
        friendsCount = await this.friendshipService.countAcceptedFriends(
          user.id,
        );
      } catch (err) {
        if (process.env.DEBUG_FRIENDS === 'true') {
          // eslint-disable-next-line no-console
          console.log(
            '[DEBUG] UsersService.findMe error counting friends',
            err,
          );
        }
        friendsCount = 0;
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
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        friendsCount,
      };
    });
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
    const normalizedEmail = this.normalizeEmail(normalizedIdentifier);
    const normalizedUsername = this.normalizeUsername(normalizedIdentifier);

    return await this.userRepo.findOne({
      where: [
        {
          username: Raw((alias) => `LOWER(${alias}) = LOWER(:username)`, {
            username: normalizedUsername,
          }),
        },
        {
          email: Raw((alias) => `LOWER(${alias}) = LOWER(:email)`, {
            email: normalizedEmail,
          }),
        },
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
      where: {
        email: Raw((alias) => `LOWER(${alias}) = LOWER(:email)`, {
          email: this.normalizeEmail(email),
        }),
      },
    });
  }

  async findByUsername(username: string) {
    return await this.userRepo.findOne({
      where: {
        username: Raw((alias) => `LOWER(${alias}) = LOWER(:username)`, {
          username: this.normalizeUsername(username),
        }),
      },
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

    this.readCache.deleteByPrefix('users:profile');
    return await this.userRepo.save(user);
  }

  async remove(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userRepo.manager.transaction(async (manager: EntityManager) => {
      await this.purgeUserData(manager, id);
      await manager.delete(User, { id });
    });

    this.readCache.deleteByPrefix('users:profile');
    return { message: 'User deleted successfully' };
  }

  async markEmailAsVerified(userId: string) {
    this.readCache.deleteByPrefix('users:profile');
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
        'isEmailVerified',
        'isPhoneVerified',
        'deletedAt',
      ],
    });
  }

  private async purgeUserData(manager: EntityManager, userId: string) {
    // ─────────────────────────────────────────────────────────────────────────
    // Step 1: Delete provider-related data (if user owns a provider)
    // ─────────────────────────────────────────────────────────────────────────

    // Delete all data for providers owned by this user
    // Events are tied to places via venueId, so delete events for places of owned providers
    await manager.query(
      'DELETE FROM event_comments WHERE event_id IN (SELECT e.id FROM events e WHERE e."venueId" IN (SELECT p.id FROM places p WHERE p."providerId" IN (SELECT id FROM providers WHERE owner_user_id = $1)))',
      [userId],
    );

    await manager.query(
      'DELETE FROM reviews WHERE event_id IN (SELECT e.id FROM events e WHERE e."venueId" IN (SELECT p.id FROM places p WHERE p."providerId" IN (SELECT id FROM providers WHERE owner_user_id = $1)))',
      [userId],
    );

    await manager.query(
      'DELETE FROM events WHERE "venueId" IN (SELECT id FROM places WHERE "providerId" IN (SELECT id FROM providers WHERE owner_user_id = $1))',
      [userId],
    );

    // Delete place-related data
    await manager.query(
      'DELETE FROM place_opening_hours WHERE "placeId" IN (SELECT id FROM places WHERE "providerId" IN (SELECT id FROM providers WHERE owner_user_id = $1))',
      [userId],
    );

    await manager.query(
      'DELETE FROM place_pricing WHERE "placeId" IN (SELECT id FROM places WHERE "providerId" IN (SELECT id FROM providers WHERE owner_user_id = $1))',
      [userId],
    );

    await manager.query(
      'DELETE FROM place_comments WHERE place_id IN (SELECT id FROM places WHERE "providerId" IN (SELECT id FROM providers WHERE owner_user_id = $1))',
      [userId],
    );

    await manager.query(
      'DELETE FROM reviews WHERE place_id IN (SELECT id FROM places WHERE "providerId" IN (SELECT id FROM providers WHERE owner_user_id = $1))',
      [userId],
    );

    await manager.query(
      'DELETE FROM wishlists WHERE place_id IN (SELECT id FROM places WHERE "providerId" IN (SELECT id FROM providers WHERE owner_user_id = $1))',
      [userId],
    );

    // Delete places owned by providers of this user
    await manager.query(
      'DELETE FROM places WHERE "providerId" IN (SELECT id FROM providers WHERE owner_user_id = $1)',
      [userId],
    );

    // Delete provider memberships for providers owned by this user
    await manager.query(
      'DELETE FROM provider_memberships WHERE "providerId" IN (SELECT id FROM providers WHERE owner_user_id = $1)',
      [userId],
    );

    // Finally, delete the providers themselves
    await manager.query('DELETE FROM providers WHERE owner_user_id = $1', [
      userId,
    ]);

    // Also delete provider memberships for this user directly (user as member, not owner)
    await manager.query(
      'DELETE FROM provider_memberships WHERE "userId" = $1',
      [userId],
    );

    // Also delete provider applications by this user
    await manager.query(
      'DELETE FROM provider_applications WHERE user_id = $1',
      [userId],
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Step 2: Delete direct user-related data
    // ─────────────────────────────────────────────────────────────────────────

    const directDeletes: Array<[string, string[]]> = [
      [
        'DELETE FROM notifications WHERE recipient_id = $1 OR actor_id = $1',
        [userId],
      ],
      [
        'DELETE FROM follow_relations WHERE follower_id = $1 OR following_id = $1',
        [userId],
      ],
      [
        'DELETE FROM block_relations WHERE blocker_id = $1 OR blocked_id = $1',
        [userId],
      ],
      [
        'DELETE FROM mute_relations WHERE muter_id = $1 OR muted_id = $1',
        [userId],
      ],
      ['DELETE FROM conversation_members WHERE user_id = $1', [userId]],
      ['DELETE FROM bookings WHERE user_id = $1', [userId]],
      ['DELETE FROM trip_plans WHERE user_id = $1', [userId]],
      ['DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]],
      ['DELETE FROM reviews WHERE user_id = $1', [userId]],
      ['DELETE FROM event_comments WHERE user_id = $1', [userId]],
      ['DELETE FROM place_comments WHERE user_id = $1', [userId]],
    ];

    for (const [sql, params] of directDeletes) {
      await manager.query(sql, params);
    }

    await manager.query(
      'UPDATE event_comments SET parent_id = NULL WHERE parent_id IN (SELECT id FROM event_comments WHERE user_id = $1)',
      [userId],
    );

    await manager.query(
      'UPDATE place_comments SET parent_id = NULL WHERE parent_id IN (SELECT id FROM place_comments WHERE user_id = $1)',
      [userId],
    );

    await manager.query(
      'UPDATE reviews SET moderated_by = NULL WHERE moderated_by = $1',
      [userId],
    );

    await manager.query(
      'UPDATE event_comments SET moderated_by = NULL WHERE moderated_by = $1',
      [userId],
    );

    await manager.query(
      'UPDATE place_comments SET moderated_by = NULL WHERE moderated_by = $1',
      [userId],
    );

    await manager.query(
      'UPDATE post_reports SET moderated_by = NULL WHERE moderated_by = $1',
      [userId],
    );

    await manager.query(
      'UPDATE post_comments SET parent_id = NULL WHERE post_id IN (SELECT id FROM social_posts WHERE author_id = $1)',
      [userId],
    );

    await manager.query(
      'DELETE FROM post_comments WHERE post_id IN (SELECT id FROM social_posts WHERE author_id = $1) OR author_id = $1',
      [userId],
    );

    await manager.query(
      'DELETE FROM post_reactions WHERE post_id IN (SELECT id FROM social_posts WHERE author_id = $1) OR user_id = $1',
      [userId],
    );

    await manager.query(
      'DELETE FROM post_reports WHERE post_id IN (SELECT id FROM social_posts WHERE author_id = $1) OR reporter_id = $1',
      [userId],
    );

    await manager.query(
      'DELETE FROM post_saves WHERE post_id IN (SELECT id FROM social_posts WHERE author_id = $1) OR user_id = $1',
      [userId],
    );

    await manager.query('DELETE FROM social_posts WHERE author_id = $1', [
      userId,
    ]);

    await manager.query(
      'DELETE FROM story_views WHERE story_id IN (SELECT id FROM stories WHERE author_id = $1) OR viewer_id = $1',
      [userId],
    );

    await manager.query('DELETE FROM stories WHERE author_id = $1', [userId]);

    await manager.query(
      'UPDATE messages SET reply_to_message_id = NULL WHERE reply_to_message_id IN (SELECT id FROM messages WHERE sender_id = $1)',
      [userId],
    );

    await manager.query(
      'DELETE FROM message_receipts WHERE message_id IN (SELECT id FROM messages WHERE sender_id = $1) OR user_id = $1',
      [userId],
    );

    await manager.query(
      'DELETE FROM message_reactions WHERE message_id IN (SELECT id FROM messages WHERE sender_id = $1) OR user_id = $1',
      [userId],
    );

    await manager.query('DELETE FROM messages WHERE sender_id = $1', [userId]);
  }
}
