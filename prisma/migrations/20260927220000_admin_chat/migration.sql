-- CreateTable
CREATE TABLE "AdminChatRoom" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminChatMessage" (
    "id" TEXT NOT NULL,
    "chatRoomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminChatRoom_companyId_key" ON "AdminChatRoom"("companyId");

-- CreateIndex
CREATE INDEX "AdminChatMessage_senderId_createdAt_idx" ON "AdminChatMessage"("senderId", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminChatRoom" ADD CONSTRAINT "AdminChatRoom_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminChatMessage" ADD CONSTRAINT "AdminChatMessage_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "AdminChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminChatMessage" ADD CONSTRAINT "AdminChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
