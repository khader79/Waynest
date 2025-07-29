import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password1: string) {
    const user = await this.userRepo.findOne({ where: { email: email } });
    if (!user) throw new UnauthorizedException('wrong email');

    const passMatch = await bcrypt.compare(password1, user.password);
    if (!passMatch) throw new UnauthorizedException('wrong password');
    const { password, ...result } = user;
    const pyload = { email: result.email, id: result.userid };

    return { access_token: this.jwtService.sign(pyload), result };
  }

  async emailFound(email: string) {
    const user = await this.userRepo.findOne({ where: { email: email } });
    if (user) {
      throw new ConflictException('Email already exists');
    }
    return false;
  }
}
