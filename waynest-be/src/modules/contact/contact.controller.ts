import { Body, Controller, HttpCode, Post, ValidationPipe } from '@nestjs/common';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private service: ContactService) {}

  @Post()
  @HttpCode(200)
  async submit(@Body(new ValidationPipe({ whitelist: true })) body: { name: string; email: string; subject: string; message: string }) {
    await this.service.sendContactMessage(body);
    return { message: 'Message sent successfully' };
  }
}
