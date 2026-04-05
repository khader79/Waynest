import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new UnauthorizedException('JWT_SECRET is not configured');
    }

    // Nest's PassportStrategy typing does not fully model the strategy constructor.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) =>
          req?.cookies?.access_token ? String(req.cookies.access_token) : null,
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    username: string;
    role?: string;
  }) {
    const currentUser = await this.usersService.findMe(payload.sub);
    return {
      sub: currentUser.id,
      userId: currentUser.id,
      email: currentUser.email ?? payload.email,
      username: currentUser.username ?? payload.username,
      role: currentUser.role,
    };
  }
}
