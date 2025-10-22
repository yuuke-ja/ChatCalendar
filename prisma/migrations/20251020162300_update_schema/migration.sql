/*
  Warnings:

  - You are about to drop the column `postedBy` on the `Chatmessage` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Chatmessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chatmessage" DROP COLUMN "postedBy",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Chatmessage" ADD CONSTRAINT "Chatmessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
