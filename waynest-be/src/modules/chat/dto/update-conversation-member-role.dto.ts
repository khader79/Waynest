import { IsIn } from 'class-validator';
import type { ConversationMemberRole } from '../entities/conversation-member.entity';

export class UpdateConversationMemberRoleDto {
  @IsIn(['MEMBER', 'ADMIN'])
  role: ConversationMemberRole;
}
