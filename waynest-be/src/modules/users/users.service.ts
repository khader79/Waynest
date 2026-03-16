import {
  BadRequestException,
  Injectable,
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
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    this.seedAdmin();
  }

  private async seedAdmin() {
    const username = 'admin';
    const adminExists = await this.userRepo.findOne({ where: { username } });

    if (adminExists) return;

    const passwordHash = await bcrypt.hash('admin123', 10);
    const admin = this.userRepo.create({
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@waynest.com',
      username: 'admin',
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

    const { deletedAt, ...safeUser } = user;
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
