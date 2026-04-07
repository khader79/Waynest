CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at_id ON messages (conversation_id, created_at DESC, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_message_receipts_user_message ON message_receipts (user_id, message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_conversation ON conversation_members (user_id, conversation_id);
