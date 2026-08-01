// Resource.id 迁移：cuid(String) → 自增 Int（1、2、3…）
// 重建 8 张表（Resource + 7 张引用表），引用按旧 id 映射重写。
// 执行前请确保应用已停止（pm2 stop library）。
const { createClient } = require("/root/library/node_modules/@libsql/client");
const { execSync } = require("child_process");
const path = require("path");

const DB_PATH = "/root/library/dev.db";
const PREBAK = `/root/library/dev.db.migrate-prebak-${Date.now()}`;

execSync(`cp ${DB_PATH} ${PREBAK}`);
console.log("[MIGRATE] 迁移前备份:", path.basename(PREBAK));

const db = createClient({ url: `file:${DB_PATH}` });
const exec = async (sql, args) => { await db.execute({ sql, args }); };
const q = async (sql, args) => (await db.execute({ sql, args })).rows;

const TABLES = [
  {
    name: "ResourceTag",
    columns: ["resourceId", "tagId"],
    sql: `CREATE TABLE "ResourceTag" (
      "resourceId" INTEGER NOT NULL,
      "tagId" TEXT NOT NULL,
      CONSTRAINT "ResourceTag_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ResourceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      PRIMARY KEY ("resourceId","tagId")
    )`,
  },
  {
    name: "ResourceFile",
    columns: ["id", "resourceId", "fileName", "fileUrl", "fileSize", "order", "createdAt"],
    sql: `CREATE TABLE "ResourceFile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "resourceId" INTEGER NOT NULL,
      "fileName" TEXT NOT NULL,
      "fileUrl" TEXT NOT NULL,
      "fileSize" INTEGER NOT NULL DEFAULT 0,
      "order" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ResourceFile_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  },
  {
    name: "ComicBinding",
    columns: ["id", "resourceId", "sourceId", "mangaId", "createdAt"],
    sql: `CREATE TABLE "ComicBinding" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "resourceId" INTEGER NOT NULL,
      "sourceId" TEXT NOT NULL,
      "mangaId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ComicBinding_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    after: async () => {
      await exec(`DROP INDEX IF EXISTS "ComicBinding_sourceId_mangaId_key"`);
      await exec(`DROP INDEX IF EXISTS "ComicBinding_resourceId_idx"`);
      await exec(`CREATE UNIQUE INDEX "ComicBinding_sourceId_mangaId_key" ON "ComicBinding"("sourceId", "mangaId")`);
      await exec(`CREATE INDEX "ComicBinding_resourceId_idx" ON "ComicBinding"("resourceId")`);
    },
  },
  {
    name: "Comment",
    columns: ["id", "content", "userId", "resourceId", "collectionId", "parentId", "createdAt"],
    sql: `CREATE TABLE "Comment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "content" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "resourceId" INTEGER,
      "collectionId" TEXT,
      "parentId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Comment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Comment_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
  },
  {
    name: "Recommendation",
    columns: ["id", "userId", "resourceId", "note", "createdAt"],
    sql: `CREATE TABLE "Recommendation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "resourceId" INTEGER NOT NULL,
      "note" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Recommendation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    after: async () => {
      await exec(`DROP INDEX IF EXISTS "Recommendation_userId_resourceId_key"`);
      await exec(`CREATE UNIQUE INDEX "Recommendation_userId_resourceId_key" ON "Recommendation"("userId", "resourceId")`);
    },
  },
  {
    name: "CollectionResource",
    columns: ["id", "collectionId", "resourceId", "note", "addedAt"],
    sql: `CREATE TABLE "CollectionResource" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "collectionId" TEXT NOT NULL,
      "resourceId" INTEGER NOT NULL,
      "note" TEXT,
      "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CollectionResource_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CollectionResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    after: async () => {
      await exec(`DROP INDEX IF EXISTS "CollectionResource_collectionId_resourceId_key"`);
      await exec(`CREATE UNIQUE INDEX "CollectionResource_collectionId_resourceId_key" ON "CollectionResource"("collectionId", "resourceId")`);
    },
  },
  {
    name: "Activity",
    columns: ["id", "type", "userId", "resourceId", "collectionId", "metadata", "createdAt"],
    sql: `CREATE TABLE "Activity" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "type" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "resourceId" INTEGER,
      "collectionId" TEXT,
      "metadata" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Activity_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON UPDATE CASCADE,
      CONSTRAINT "Activity_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON UPDATE CASCADE
    )`,
  },
];

(async () => {
  try {
    const before = (await q(`SELECT COUNT(*) AS c FROM "Resource"`))[0].c;
    console.log("[MIGRATE] 迁移前 Resource 总数:", before);

    console.log("[MIGRATE] 1/9 关闭外键，创建 id 映射");
    await exec(`PRAGMA foreign_keys=OFF`);
    await exec(`CREATE TABLE "_ResourceIdMap" ("old" TEXT PRIMARY KEY, "new" INTEGER NOT NULL)`);
    await exec(`INSERT INTO "_ResourceIdMap" ("old", "new") SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "rowid") FROM "Resource"`);
    const mapCount = (await q(`SELECT COUNT(*) AS c FROM "_ResourceIdMap"`))[0].c;
    console.log("[MIGRATE] 映射条数:", mapCount);

    console.log("[MIGRATE] 2/9 重建 Resource（自增 Int id）");
    await exec(`ALTER TABLE "Resource" RENAME TO "_Resource_old"`);
    await exec(`CREATE TABLE "Resource" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "title" TEXT NOT NULL,
      "author" TEXT,
      "description" TEXT,
      "coverImage" TEXT,
      "type" TEXT NOT NULL DEFAULT 'BOOK',
      "comicSourceId" TEXT,
      "comicMangaId" TEXT,
      "uploaderId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Resource_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`);
    await exec(`INSERT INTO "Resource" ("id","title","author","description","coverImage","type","comicSourceId","comicMangaId","uploaderId","createdAt","updatedAt")
      SELECT m."new", o."title", o."author", o."description", o."coverImage", o."type", o."comicSourceId", o."comicMangaId", o."uploaderId", o."createdAt", o."updatedAt"
      FROM "_Resource_old" o JOIN "_ResourceIdMap" m ON m."old" = o."id"`);

    for (let i = 0; i < TABLES.length; i++) {
      const t = TABLES[i];
      console.log(`[MIGRATE] ${i + 3}/9 重建 ${t.name}`);
      await exec(`ALTER TABLE "${t.name}" RENAME TO "_${t.name}_old"`);
      await exec(t.sql);
      const cols = t.columns.join('", "');
      const mapped = t.columns.map((c) => (c === "resourceId" ? `m."new"` : `o."${c}"`)).join(", ");
      await exec(`INSERT INTO "${t.name}" ("${cols}")
        SELECT ${mapped} FROM "_${t.name}_old" o JOIN "_ResourceIdMap" m ON m."old" = o."resourceId"`);
      if (t.after) await t.after();
      await exec(`DROP TABLE "_${t.name}_old"`);
    }

    console.log("[MIGRATE] 9/9 清理 + 恢复外键");
    await exec(`DROP TABLE "_Resource_old"`);
    await exec(`DROP TABLE "_ResourceIdMap"`);
    await exec(`PRAGMA foreign_keys=ON`);

    // ===== 校验 =====
    console.log("\n===== 迁移校验 =====");
    const after = (await q(`SELECT COUNT(*) AS c FROM "Resource"`))[0].c;
    console.log("Resource 总数:", after, after === before ? "✓" : "✗ 不一致！");
    const seq = (await q(`SELECT seq FROM "sqlite_sequence" WHERE name = 'Resource'`))[0];
    console.log("AUTOINCREMENT 序列值:", seq?.seq, after > 0 && seq?.seq === after ? "✓" : "（注意核对）");
    const rows = await q(`SELECT "id", "title", "type" FROM "Resource" ORDER BY "id"`);
    rows.forEach((r) => console.log(`  ${r.id}: ${r.title} (${r.type})`));
    for (const t of TABLES) {
      const orphan = (await q(`SELECT COUNT(*) AS c FROM "${t.name}" o WHERE o."resourceId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Resource" r WHERE r."id" = o."resourceId")`))[0].c;
      const cnt = (await q(`SELECT COUNT(*) AS c FROM "${t.name}"`))[0].c;
      console.log(`${t.name}: ${cnt} 行${orphan > 0 ? `，孤儿引用 ${orphan} ✗` : "，引用完整 ✓"}`);
    }
    console.log("\n[MIGRATE] 完成。失败回退：", `cp ${PREBAK} ${DB_PATH}`);
    process.exit(0);
  } catch (e) {
    console.error("[MIGRATE] 失败:", e.message);
    console.error(`回退命令：cp ${PREBAK} ${DB_PATH}`);
    process.exit(1);
  }
})();
