-- CreateTable
CREATE TABLE "Post" (
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "postedBy" VARCHAR(255) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("createdAt")
);
