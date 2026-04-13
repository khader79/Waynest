import {
  Body,
  Controller,
  Delete,
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
import { AddConversationMembersDto } from './dto/add-conversation-members.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageReactionDto } from './dto/message-reaction.dto';

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
  createConversation(
    @Request() req: AuthRequest,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(req.user.sub, dto);
  }

  @Get('inbox')
  inbox(@Request() req: AuthRequest) {
    return this.chatService.inbox(req.user.sub);
  }

  @Get('global-messages')
  globalMessages(
    @Request() req: AuthRequest,
    @Query() query: ListMessagesQueryDto,
  ) {
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

  @Patch('messages/:id')
  editMessage(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateMessageDto,
    @Query('conversationId') conversationId: string,
  ) {
    return this.chatService.editMessage(conversationId, id, req.user.sub, dto);
  }

  @Post('messages/:id/reactions')
  react(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: MessageReactionDto,
    @Query('conversationId') conversationId: string,
  ) {
    return this.chatService.toggleMessageReaction(
      conversationId,
      id,
      req.user.sub,
      dto,
    );
  }

  @Delete('messages/:id')
  deleteMessage(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Query('conversationId') conversationId: string,
  ) {
    return this.chatService.deleteMessage(conversationId, id, req.user.sub);
  }

  @Patch('conversations/:id/read')
  read(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.chatService.markRead(id, req.user.sub);
  }

  @Patch('conversations/:id')
  updateConversation(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.chatService.updateConversation(id, req.user.sub, dto);
  }

  @Patch('conversations/:id/pin')
  pinConversation(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.chatService.pinConversation(id, req.user.sub);
  }

  @Patch('conversations/:id/unpin')
  unpinConversation(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.chatService.unpinConversation(id, req.user.sub);
  }

  @Patch('conversations/:id/mute')
  muteConversation(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.chatService.muteConversation(id, req.user.sub);
  }

  @Patch('conversations/:id/unmute')
  unmuteConversation(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.chatService.unmuteConversation(id, req.user.sub);
  }

  @Patch('conversations/:id/archive')
  archiveConversation(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.chatService.archiveConversation(id, req.user.sub);
  }

  @Patch('conversations/:id/unarchive')
  unarchiveConversation(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.chatService.unarchiveConversation(id, req.user.sub);
  }

  @Post('conversations/:id/members')
  addMembers(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: AddConversationMembersDto,
  ) {
    return this.chatService.addConversationMembers(id, req.user.sub, dto);
  }

  @Delete('conversations/:id/members/:userId')
  removeMember(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.chatService.removeConversationMember(id, req.user.sub, userId);
  }
}
