import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
  }

  private async seedAdmin() {
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();
    if (!adminPassword) {
      this.logger.log(
        'Skipping admin bootstrap because ADMIN_PASSWORD is not set.',
      );
      return;
    }

    const username = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const email = process.env.ADMIN_EMAIL?.trim() || 'admin@waynest.com';
    const adminExists = await this.userRepo.findOne({ where: { username } });

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
    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser = this.userRepo.create({
      ...userData,
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
    const user = await this.userRepo.findOne({
      where: { id },
      withDeleted: true,
      select: [
        'id',
        'email',
        'username',
        'role',
        'firstName',
        'lastName',
        'deletedAt',
      ],
    });

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

  async findOneByEmailOrUsername(identifier: string) {
    return await this.userRepo.findOne({
      where: [{ username: identifier }, { email: identifier }],
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
    return await this.userRepo.findOne({ where: { email } });
  }

  async findByUsername(username: string) {
    return await this.userRepo.findOne({ where: { username } });
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

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found in our system');

    const { password, ...rest } = updateUserDto;
    Object.assign(user, rest);

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
}
