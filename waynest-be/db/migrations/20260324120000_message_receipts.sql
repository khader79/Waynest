-- message_receipts: delivery/read receipts per message per recipient.
-- Apply when TypeORM synchronize is disabled. Requires PostgreSQL (gen_random_uuid).

CREATE TABLE IF NOT EXISTS "message_receipts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "message_id" character varying NOT NULL,
  "user_id" character varying NOT NULL,
  "delivered_at" TIMESTAMP NULL,
  "read_at" TIMESTAMP NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMP NULL,
  CONSTRAINT "PK_message_receipts_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_message_receipts_message_user" UNIQUE ("message_id", "user_id"),
  CONSTRAINT "FK_message_receipts_message"
    FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_message_receipts_user_id" ON "message_receipts" ("user_id");
