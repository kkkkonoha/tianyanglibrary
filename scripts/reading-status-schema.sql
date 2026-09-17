-- 仅新增阅读状态和贡献流水结构，不删除或覆盖任何现有数据。
CREATE TABLE IF NOT EXISTS "ReadingStatusEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "resourceId" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "note" TEXT,
  "activityId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ReadingStatusEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
  CONSTRAINT "ReadingStatusEntry_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReadingStatusEntry_userId_resourceId_key" ON "ReadingStatusEntry"("userId", "resourceId");
CREATE INDEX IF NOT EXISTS "ReadingStatusEntry_userId_status_idx" ON "ReadingStatusEntry"("userId", "status");
CREATE INDEX IF NOT EXISTS "ReadingStatusEntry_resourceId_status_idx" ON "ReadingStatusEntry"("resourceId", "status");

CREATE TABLE IF NOT EXISTS "ReadingStatusHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entryId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "resourceId" INTEGER NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "note" TEXT,
  "activityId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReadingStatusHistory_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ReadingStatusEntry" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ReadingStatusHistory_userId_resourceId_createdAt_idx" ON "ReadingStatusHistory"("userId", "resourceId", "createdAt");

CREATE TABLE IF NOT EXISTS "ContributionEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContributionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ContributionEntry_userId_createdAt_idx" ON "ContributionEntry"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ContributionEntry_action_createdAt_idx" ON "ContributionEntry"("action", "createdAt");
