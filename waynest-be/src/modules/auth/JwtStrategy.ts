import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new UnauthorizedException('JWT_SECRET is not configured');
    }

    // Nest's PassportStrategy typing does not fully model the strategy constructor.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      jwtFromRequest: (req: Request) =>
        req?.cookies?.access_token ? String(req.cookies.access_token) : null,
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  validate(payload: {
    sub: string;
    email: string;
    username: string;
    role: string;
  }) {
    return {
      sub: payload.sub,
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    };
  }
}
