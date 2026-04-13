ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

UPDATE conversations c
SET created_by_user_id = COALESCE(
  (
    SELECT m.sender_id
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m."createdAt" ASC, m.id ASC
    LIMIT 1
  ),
  (
    SELECT cm.user_id
    FROM conversation_members cm
    WHERE cm.conversation_id = c.id
    ORDER BY cm."createdAt" ASC, cm.id ASC
    LIMIT 1
  )
)
WHERE c.created_by_user_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'fk_conversations_created_by_user'
      AND tc.table_name = 'conversations'
  ) THEN
    ALTER TABLE conversations
    ADD CONSTRAINT fk_conversations_created_by_user
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_created_by_user
ON conversations (created_by_user_id);
