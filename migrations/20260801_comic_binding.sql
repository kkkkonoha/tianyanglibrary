CREATE TABLE "ComicBinding" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "resourceId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "mangaId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComicBinding_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ComicBinding_sourceId_mangaId_key" ON "ComicBinding"("sourceId", "mangaId");
CREATE INDEX "ComicBinding_resourceId_idx" ON "ComicBinding"("resourceId");

INSERT INTO "ComicBinding" ("id", "resourceId", "sourceId", "mangaId")
SELECT lower(hex(randomblob(16))), "id", "comicSourceId", "comicMangaId"
FROM "Resource"
WHERE "type" = 'COMIC' AND "comicSourceId" IS NOT NULL AND "comicMangaId" IS NOT NULL;
