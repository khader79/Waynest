import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';

type AuthRequest = {
  user: {
    sub: string;
  };
};

@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  createConversation(@Request() req: AuthRequest, @Body() dto: CreateConversationDto) {
    return this.chatService.createConversation(req.user.sub, dto);
  }

  @Get('inbox')
  inbox(@Request() req: AuthRequest) {
    return this.chatService.inbox(req.user.sub);
  }

  @Get('global-messages')
  globalMessages(@Request() req: AuthRequest, @Query() query: ListMessagesQueryDto) {
    return this.chatService.globalMessages(req.user.sub, query);
  }

  @Get('conversations/:id/messages')
  messages(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.chatService.listMessages(id, req.user.sub, query);
  }

  @Post('conversations/:id/messages')
  send(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(id, req.user.sub, dto);
  }

  @Patch('conversations/:id/read')
  read(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.chatService.markRead(id, req.user.sub);
  }
}
