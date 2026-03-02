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
    if (!adminExists) {
      const admin = this.userRepo.create({
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@waynest.com',
        username: 'admin',
        passwordHash: 'admin123',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
      });
      await this.userRepo.save(admin);
    }
  }

  async create(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;

    const newUser = this.userRepo.create({
      ...userData,
      passwordHash: password,
    });

    return await this.userRepo.save(newUser);
  }

  async findAll(includeDeleted = false) {
    return await this.userRepo.find({ withDeleted: includeDeleted });
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException('User not found in our system');
    }

    if (user.deletedAt) {
      throw new BadRequestException(
        'This account has been deleted/deactivated',
      );
    }

    return user;
  }

  async findOneByEmailOrUsername(identifier: string) {
    return await this.userRepo.findOne({
      where: [{ username: identifier }, { email: identifier }],
    });
  }

  async findByEmail(email: string) {
    return await this.userRepo.findOne({ where: { email } });
  }

  async findByUsername(username: string) {
    return await this.userRepo.findOne({ where: { username } });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    return;
  }

  async remove(id: string) {
    const user = this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return await this.userRepo.softDelete(id);
  }
  

}
