-- 修复 FavoriteResource 外键：id 迁移的 RENAME 使 FK 悬空指向已删除的 _Resource_old
-- 重建表（FK 正确指向 Resource）+ 保留数据 + 重建索引
ALTER TABLE "FavoriteResource" RENAME TO "_FavoriteResource_old";

CREATE TABLE "FavoriteResource" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "resourceId" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FavoriteResource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FavoriteResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "FavoriteResource" ("id", "userId", "resourceId", "createdAt")
SELECT "id", "userId", "resourceId", "createdAt" FROM "_FavoriteResource_old";

DROP TABLE "_FavoriteResource_old";

CREATE UNIQUE INDEX "FavoriteResource_userId_resourceId_key" ON "FavoriteResource"("userId", "resourceId");
CREATE INDEX "FavoriteResource_resourceId_idx" ON "FavoriteResource"("resourceId");
