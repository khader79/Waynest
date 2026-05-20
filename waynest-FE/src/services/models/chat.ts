import { User } from './user';

export interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string | null;
  isGroup: boolean;
  createdByUserId: string | null;
}

export type ConversationMemberRole = 'MEMBER' | 'ADMIN';

export interface ConversationMember {
  id: string;
  createdAt: string;
  updatedAt: string;
  conversation?: Conversation;
  conversationId: string;
  user?: User;
  userId: string;
  conversationRole: ConversationMemberRole;
  lastReadAt: string | null;
  pinnedAt: string | null;
  mutedAt: string | null;
  archivedAt: string | null;
}

export interface Message {
  id: string;
  createdAt: string;
  updatedAt: string;
  conversation?: Conversation;
  conversationId: string;
  sender?: User;
  senderId: string;
  content: string;
  replyToMessage?: Message | null;
  replyToMessageId: string | null;
  editedAt: string | null;
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'seen';
  receipts?: MessageReceipt[];
  reactions?: MessageReaction[];
}

export interface MessageReceipt {
  id: string;
  createdAt: string;
  updatedAt: string;
  message?: Message;
  messageId: string;
  user?: User;
  userId: string;
  deliveredAt: string | null;
  readAt: string | null;
}

export interface MessageReaction {
  id: string;
  createdAt: string;
  updatedAt: string;
  message?: Message;
  messageId: string;
  user?: User;
  userId: string;
  emoji: string;
}
