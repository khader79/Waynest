import {
  Body,
  Controller,
  HttpCode,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactMessageDto } from './dto/contact-message.dto';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private service: ContactService) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async submit(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: ContactMessageDto,
  ) {
    await this.service.sendContactMessage(body);
    return { message: 'Message sent successfully' };
  }
}
