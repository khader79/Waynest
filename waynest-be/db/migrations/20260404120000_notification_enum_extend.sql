-- Extend notifications.type enum (PostgreSQL). Run once when TypeORM synchronize is off.
-- If a value already exists, skip that line or run in a transaction with exception handling.

ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'FRIEND_REQUEST';
ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'FRIEND_ACCEPTED';
ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'BOOKING_NEW';
ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'BOOKING_STATUS';
ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'REVIEW_NEW';
