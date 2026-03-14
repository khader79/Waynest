import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { EmailVerificationToken } from './entities/email-verification.entity';


@Injectable()
export class EmailVerificationService {
  private readonly transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly tokenRepository: Repository<EmailVerificationToken>,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: this.configService.get<boolean>('MAIL_SECURE'),
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendVerificationEmail(user: User): Promise<void> {
    await this.tokenRepository.delete({ userId: user.id });

    const token = this.generateToken();
    const expiresAt = this.getExpiryDate();

    await this.tokenRepository.save({ token, userId: user.id, expiresAt });

    const verificationLink = this.buildVerificationLink(token);

    await this.transporter.sendMail({
      from: `"${this.configService.get('MAIL_FROM_NAME')}" <${this.configService.get('MAIL_FROM')}>`,
      to: user.email,
      subject: 'Verify your email',
      text: `Click the link below to verify your email\n\n${verificationLink}`,
    });
  }

  async verifyEmail(token: string): Promise<void> {
    if (!token) throw new BadRequestException('Token is required');

    const record = await this.tokenRepository.findOne({ where: { token } });

    if (!record) throw new BadRequestException('Invalid token');

    if (record.expiresAt.getTime() < Date.now()) {
      await this.tokenRepository.delete(record.id);
      throw new BadRequestException('Token expired');
    }

    await this.usersService.markEmailAsVerified(record.userId);
    await this.tokenRepository.delete(record.id);
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private getExpiryDate(): Date {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  private buildVerificationLink(token: string): string {
    const appUrl = this.configService.get<string>('APP_URL') || '';
    const baseUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;

    return `${baseUrl}/email-verification/verify?token=${token}`;
  }
}
