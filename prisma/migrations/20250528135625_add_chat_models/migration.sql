-- CreateTable
CREATE TABLE "Chatroom" (
    "id" SERIAL NOT NULL,
    "chatid" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "Chatroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chatmessage" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatId" INTEGER NOT NULL,

    CONSTRAINT "Chatmessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Chatroom_chatid_key" ON "Chatroom"("chatid");

-- AddForeignKey
ALTER TABLE "Chatmessage" ADD CONSTRAINT "Chatmessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chatroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
