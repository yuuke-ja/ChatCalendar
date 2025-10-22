/*
  Warnings:

  - A unique constraint covering the columns `[chatroomId,userId]` on the table `Chatmember` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Chatmember_chatroomId_userId_key" ON "Chatmember"("chatroomId", "userId");
