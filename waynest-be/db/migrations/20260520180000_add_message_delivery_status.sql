-- Add delivery_status column to messages table for tracking message delivery states.
-- States: pending, sent, delivered, seen

ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "delivery_status" varchar(20) NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS "IDX_messages_delivery_status" ON "messages" ("delivery_status");
