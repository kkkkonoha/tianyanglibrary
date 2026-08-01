ALTER TABLE "Resource" ADD COLUMN "comicSourceId" TEXT;
ALTER TABLE "Resource" ADD COLUMN "comicMangaId" TEXT;

CREATE TABLE "ReadingHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "mangaId" TEXT NOT NULL,
  "mangaTitle" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "chapterName" TEXT NOT NULL,
  "pageIndex" INTEGER NOT NULL DEFAULT 0,
  "totalPages" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ReadingHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReadingHistory_userId_mangaId_key" ON "ReadingHistory"("userId", "mangaId");
