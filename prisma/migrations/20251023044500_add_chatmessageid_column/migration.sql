-- Ensure chatmessageId column exists and captures unread messages
ALTER TABLE "Countbatch" ADD COLUMN IF NOT EXISTS "chatmessageId" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Backfill existing rows with empty arrays
UPDATE "Countbatch" SET "chatmessageId" = ARRAY[]::INTEGER[] WHERE "chatmessageId" IS NULL;
