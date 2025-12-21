/*
  Warnings:

  - A unique constraint covering the columns `[userId,messageId,emoji,type]` on the table `Reaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Reaction_userId_messageId_emoji_key";

-- AlterTable
ALTER TABLE "Reaction" ADD COLUMN     "type" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_messageId_emoji_type_key" ON "Reaction"("userId", "messageId", "emoji", "type");
