/*
  Warnings:

  - Added the required column `postedBy` to the `Chatmessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chatmessage" ADD COLUMN     "postedBy" TEXT NOT NULL;
