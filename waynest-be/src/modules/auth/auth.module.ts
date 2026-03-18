import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './JwtStrategy';
import { ProvidersModule } from '../providers/providers.module';
import { EmailVerificationModule } from '../email-verification/email-verification.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteToken } from './entities/invite-token.entity';

@Module({
  imports: [
    UsersModule,
    ProvidersModule,
    TypeOrmModule.forFeature([InviteToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    EmailVerificationModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
