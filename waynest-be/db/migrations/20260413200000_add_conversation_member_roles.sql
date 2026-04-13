ALTER TABLE conversation_members
ADD COLUMN IF NOT EXISTS conversation_role varchar(16) NOT NULL DEFAULT 'MEMBER';

UPDATE conversation_members cm
SET conversation_role = 'ADMIN'
FROM conversations c
WHERE c.id = cm.conversation_id
  AND c.created_by_user_id = cm.user_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'chk_conversation_members_role'
      AND tc.table_name = 'conversation_members'
  ) THEN
    ALTER TABLE conversation_members
    ADD CONSTRAINT chk_conversation_members_role
    CHECK (conversation_role IN ('MEMBER', 'ADMIN'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversation_members_role
ON conversation_members (conversation_role);
