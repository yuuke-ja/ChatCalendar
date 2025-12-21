-- AlterTable
ALTER TABLE "Chatmessage" ADD COLUMN     "contentdeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imagedeleted" BOOLEAN NOT NULL DEFAULT false;
