import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { ContactMessageDto } from './dto/contact-message.dto';

@Injectable()
export class ContactService {
  private transporter: nodemailer.Transporter;
  private mailFrom: string;
  private mailFromName: string;

  constructor(private configService: ConfigService) {
    const mailHost = this.configService.get<string>('MAIL_HOST')?.trim();
    const mailUser = this.configService.get<string>('MAIL_USER')?.trim();
    const mailPass = this.configService.get<string>('MAIL_PASS')?.trim() || '';
    const portRaw = this.configService.get<string>('MAIL_PORT');
    const mailPort = portRaw ? parseInt(portRaw, 10) : 587;
    const secureRaw = this.configService
      .get<string>('MAIL_SECURE')
      ?.trim()
      .toLowerCase();
    const secure = secureRaw === 'true' || secureRaw === '1';

    this.mailFrom =
      this.configService.get<string>('MAIL_FROM')?.trim() || mailUser || '';
    this.mailFromName =
      this.configService.get<string>('MAIL_FROM_NAME')?.trim() || 'Waynest';

    this.transporter = nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure,
      auth: { user: mailUser, pass: mailPass },
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async sendContactMessage(payload: ContactMessageDto) {
    const name = this.escapeHtml(payload.name);
    const email = this.escapeHtml(payload.email);
    const subject = this.escapeHtml(payload.subject);
    const message = this.escapeHtml(payload.message);

    await this.transporter.sendMail({
      from: `"${this.mailFromName} Contact" <${this.mailFrom}>`,
      to: this.mailFrom,
      replyTo: payload.email,
      subject: `[Contact Form] ${payload.subject} — ${payload.name}`,
      text: `Name: ${payload.name}\nEmail: ${payload.email}\nSubject: ${payload.subject}\n\nMessage:\n${payload.message}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px">
          <tr><td style="padding:8px;font-weight:700;background:#f5f5f5">Name</td><td style="padding:8px">${name}</td></tr>
          <tr><td style="padding:8px;font-weight:700;background:#f5f5f5">Email</td><td style="padding:8px">${email}</td></tr>
          <tr><td style="padding:8px;font-weight:700;background:#f5f5f5">Subject</td><td style="padding:8px">${subject}</td></tr>
        </table>
        <h3>Message</h3>
        <p style="white-space:pre-wrap">${message}</p>
      `,
    });
  }
}
