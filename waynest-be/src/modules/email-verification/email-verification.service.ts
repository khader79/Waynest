import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
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

    const code = this.generateToken();
    const expiresAt = this.getExpiryDate();

    await this.tokenRepository.save({
      token: code,
      userId: user.id,
      expiresAt,
    });

    await this.transporter.sendMail({
      from: `"${this.mailFromName}" <${this.mailFrom}>`,
      to: user.email,
      subject: 'Verify your email',
      text: `Your verification code is: ${code}`,
      html: `<b>Your verification code is: <span style="font-size: 20px;">${code}</span></b>`,
    });
  }

  async verifyEmail(code: string): Promise<void> {
    const record = await this.tokenRepository.findOne({
      where: { token: code },
    });

    if (!record) throw new BadRequestException('Invalid code');

    if (record.expiresAt.getTime() < Date.now()) {
      await this.tokenRepository.delete(record.id);
      throw new BadRequestException('Code expired');
    }

    await this.usersService.markEmailAsVerified(record.userId);
    await this.tokenRepository.delete(record.id);
  }

  async resendVerification(identifier: string): Promise<void> {
    const trimmed = (identifier || '').trim();
    if (!trimmed) {
      throw new BadRequestException('Identifier is required');
    }

    // Try to find user by email or username
    let user = await this.usersService.findByEmail(trimmed);
    if (!user) {
      user = await this.usersService.findByUsername(trimmed);
    }

    if (!user) {
      throw new NotFoundException('User not found in our system');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.sendVerificationEmail(user);
  }

  private generateToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getExpiryDate(): Date {
    return new Date(Date.now() + 15 * 60 * 1000);
  }

  private getConfigValue(key: string): string {
    return (this.configService.get<string>(key) || '').trim();
  }
}
