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
  private readonly mailFrom: string;
  private readonly mailFromName: string;

  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly tokenRepository: Repository<EmailVerificationToken>,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    const portRaw = this.configService.get<string>('MAIL_PORT');
    const port = portRaw ? Number(portRaw) : 587;
    const secureEnv = this.configService
      .get<string>('MAIL_SECURE')
      ?.toLowerCase();
    const secureFromEnv =
      secureEnv === 'true' || secureEnv === '1' || secureEnv === 'yes';
    const secure = port === 465 ? true : port === 587 ? false : secureFromEnv;

    const mailUser = this.getConfigValue('MAIL_USER');
    const mailPass = this.getConfigValue('MAIL_PASS').replace(/\s/g, '');
    this.mailFrom = this.getConfigValue('MAIL_FROM') || mailUser;
    this.mailFromName = this.getConfigValue('MAIL_FROM_NAME') || 'Waynest';

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port,
      secure,
      auth: {
        user: mailUser,
        pass: mailPass,
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
      from: `"${this.mailFromName}" <${this.mailFrom}>`,
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
    const appUrl = this.getConfigValue('APP_URL');
    if (!appUrl) {
      const port = this.getConfigValue('PORT') || '3001';
      return `http://localhost:${port}/email-verification/verify?token=${token}`;
    }
    const baseUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;

    return `${baseUrl}/email-verification/verify?token=${token}`;
  }

  private getConfigValue(key: string): string {
    return (this.configService.get<string>(key) || '').trim();
  }
}
