import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    const htmlContent = this.generateVerificationEmailHTML(code);

    await this.transporter.sendMail({
      from: `"${this.mailFromName}" <${this.mailFrom}>`,
      to: user.email,
      subject: '🔐 Verify Your Email Address - Waynest',
      text: `Your verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, please ignore this email.`,
      html: htmlContent,
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

    if (!record.userId) {
      throw new BadRequestException('Verification record is invalid');
    }

    await this.usersService.markEmailAsVerified(record.userId);
    await this.tokenRepository.delete(record.id);
  }

  async resendVerification(identifier: string): Promise<void> {
    const trimmed = (identifier || '').trim();
    if (!trimmed) {
      throw new BadRequestException('Identifier is required');
    }

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

  private generateVerificationEmailHTML(code: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 16px; color: #2d3748; margin-bottom: 20px; line-height: 1.6; }
            .message { font-size: 15px; color: #4a5568; margin-bottom: 30px; line-height: 1.6; }
            .code-section { background-color: #f7fafc; border: 2px solid #e2e8f0; border-radius: 6px; padding: 25px; text-align: center; margin: 30px 0; }
            .code-label { font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: 600; }
            .code-box { font-size: 36px; font-weight: 700; color: #667eea; letter-spacing: 4px; font-family: 'Courier New', monospace; }
            .warning { background-color: #fff5f5; border-left: 4px solid #fc8181; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .warning-text { font-size: 13px; color: #c53030; margin: 0; }
            .info { background-color: #edf2f7; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .info-text { font-size: 13px; color: #2d3748; margin: 0; }
            .support { font-size: 14px; color: #718096; margin-top: 30px; }
            .footer { background-color: #f7fafc; padding: 25px; border-top: 1px solid #e2e8f0; text-align: center; }
            .footer-text { font-size: 12px; color: #718096; margin: 5px 0; }
            .footer-link { color: #667eea; text-decoration: none; }
            .divider { border-top: 1px solid #e2e8f0; margin: 20px 0; }
            .btn { display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>🔐 Email Verification</h1>
              <p>Secure your Waynest account</p>
            </div>

            <!-- Content -->
            <div class="content">
              <p class="greeting">Hello,</p>

              <p class="message">
                Thank you for signing up with Waynest! To complete your registration and secure your account, please verify your email address using the code below.
              </p>

              <!-- Code Section -->
              <div class="code-section">
                <div class="code-label">Your Verification Code</div>
                <div class="code-box">${code}</div>
              </div>

              <!-- Info Box -->
              <div class="info">
                <p class="info-text">
                  ⏱️ <strong>This code expires in 15 minutes.</strong> Please use it soon to complete your verification.
                </p>
              </div>

              <!-- Instructions -->
              <div style="background-color: #f0f4ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #2d3748; font-weight: 600;">How to verify your email:</p>
                <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #4a5568;">
                  <li style="margin-bottom: 8px;">Go back to the Waynest verification page</li>
                  <li style="margin-bottom: 8px;">Enter the 6-digit code above</li>
                  <li>Click "Verify" to complete your registration</li>
                </ol>
              </div>

              <!-- Warning Box -->
              <div class="warning">
                <p class="warning-text">
                  ⚠️ <strong>Didn't request this?</strong> If you didn't create this account, please ignore this email. Your account will remain unverified and inactive.
                </p>
              </div>

              <p class="support">
                Need help? If you're having trouble verifying your email or didn't request this code, please don't hesitate to <a href="mailto:support@waynest.app" style="color: #667eea; text-decoration: none;">contact our support team</a>.
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                © 2024 Waynest. All rights reserved.
              </p>
              <p class="footer-text">
                <a href="https://waynest.app" class="footer-link">Visit Waynest</a> | 
                <a href="https://waynest.app/privacy" class="footer-link">Privacy Policy</a> | 
                <a href="https://waynest.app/terms" class="footer-link">Terms of Service</a>
              </p>
              <p class="footer-text" style="margin-top: 15px; font-size: 11px; color: #a0aec0;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getExpiryDate(): Date {
    return new Date(Date.now() + 15 * 60 * 1000);
  }

  private getConfigValue(key: string): string {
    return (this.configService.get<string>(key) || '').trim();
  }
}
