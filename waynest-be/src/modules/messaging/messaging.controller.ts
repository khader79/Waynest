import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagingService } from './messaging.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

type AuthRequest = {
  user: {
    sub: string;
  };
};

@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('conversations')
  createConversation(@Request() req: AuthRequest, @Body() dto: CreateConversationDto) {
    return this.messagingService.createConversation(req.user.sub, dto);
  }

  @Get('inbox')
  inbox(@Request() req: AuthRequest) {
    return this.messagingService.inbox(req.user.sub);
  }

  @Get('conversations/:id/messages')
  messages(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.messagingService.listMessages(id, req.user.sub);
  }

  @Post('conversations/:id/messages')
  send(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(id, req.user.sub, dto);
  }

  @Patch('conversations/:id/read')
  read(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.messagingService.markRead(id, req.user.sub);
  }
}

