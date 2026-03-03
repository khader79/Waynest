import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
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

  async signUp(createDto: CreateUserDto) {
    const existingEmail = await this.usersService.findByEmail(createDto.email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }
    const existingUsername = await this.usersService.findByUsername(
      createDto.username,
    );
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const user = await this.usersService.create(createDto);

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
