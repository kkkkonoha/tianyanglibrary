CREATE TABLE "FavoriteResource" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "resourceId" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FavoriteResource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FavoriteResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "FavoriteResource_userId_resourceId_key" ON "FavoriteResource"("userId", "resourceId");
CREATE INDEX "FavoriteResource_resourceId_idx" ON "FavoriteResource"("resourceId");
