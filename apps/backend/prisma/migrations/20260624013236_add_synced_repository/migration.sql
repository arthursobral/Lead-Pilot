-- CreateTable
CREATE TABLE "synced_repositories" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "githubNodeId" TEXT,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "synced_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "synced_repositories_fullName_key" ON "synced_repositories"("fullName");
