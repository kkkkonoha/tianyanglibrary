// 生产环境数据回填：旧资源收藏 → 读过；历史行为 → 不可变贡献流水。
// 本脚本不会删除 FavoriteResource 或 FAVORITE 动态，失败时可用脚本自动生成的备份回滚。
const { createClient } = require("/root/library/node_modules/@libsql/client");
const { randomUUID } = require("crypto");
const { execFileSync } = require("child_process");

const DB_PATH = "/root/library/dev.db";
const backupPath = `${DB_PATH}.migrate-reading-${Date.now()}`;
execFileSync("cp", [DB_PATH, backupPath]);
console.log(`[MIGRATE] backup: ${backupPath}`);

const db = createClient({ url: `file:${DB_PATH}` });
const q = async (sql, args = []) => (await db.execute({ sql, args })).rows;
const exec = async (sql, args = []) => db.execute({ sql, args });

const schema = [
  `CREATE TABLE IF NOT EXISTS "ReadingStatusEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "activityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ReadingStatusEntry_userId_resourceId_key" ON "ReadingStatusEntry"("userId", "resourceId")`,
  `CREATE INDEX IF NOT EXISTS "ReadingStatusEntry_userId_status_idx" ON "ReadingStatusEntry"("userId", "status")`,
  `CREATE INDEX IF NOT EXISTS "ReadingStatusEntry_resourceId_status_idx" ON "ReadingStatusEntry"("resourceId", "status")`,
  `CREATE TABLE IF NOT EXISTS "ReadingStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "activityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("entryId") REFERENCES "ReadingStatusEntry" ("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "ReadingStatusHistory_userId_resourceId_createdAt_idx" ON "ReadingStatusHistory"("userId", "resourceId", "createdAt")`,
  `CREATE TABLE IF NOT EXISTS "ContributionEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "ContributionEntry_userId_createdAt_idx" ON "ContributionEntry"("userId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "ContributionEntry_action_createdAt_idx" ON "ContributionEntry"("action", "createdAt")`,
];

async function addContribution(userId, action, points, sourceType, sourceId, createdAt) {
  const existing = await q(
    `SELECT id FROM ContributionEntry WHERE action = ? AND sourceType = ? AND sourceId = ? AND points = ? LIMIT 1`,
    [action, sourceType, String(sourceId), points],
  );
  if (existing.length > 0) return false;
  await exec(
    `INSERT INTO ContributionEntry (id, userId, action, points, sourceType, sourceId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), userId, action, points, sourceType, String(sourceId), createdAt],
  );
  return true;
}

(async () => {
  for (const statement of schema) await exec(statement);

  const favorites = await q(`SELECT id, userId, resourceId, createdAt FROM FavoriteResource ORDER BY createdAt ASC`);
  let statusCreated = 0;
  for (const favorite of favorites) {
    const existing = await q(
      `SELECT id FROM ReadingStatusEntry WHERE userId = ? AND resourceId = ? LIMIT 1`,
      [favorite.userId, favorite.resourceId],
    );
    if (existing.length > 0) continue;
    const entryId = randomUUID();
    await exec(
      `INSERT INTO ReadingStatusEntry (id, userId, resourceId, status, note, activityId, createdAt, updatedAt) VALUES (?, ?, ?, 'READ', NULL, NULL, ?, ?)`,
      [entryId, favorite.userId, favorite.resourceId, favorite.createdAt, favorite.createdAt],
    );
    await exec(
      `INSERT INTO ReadingStatusHistory (id, entryId, userId, resourceId, fromStatus, toStatus, note, activityId, createdAt) VALUES (?, ?, ?, ?, NULL, 'READ', NULL, NULL, ?)`,
      [randomUUID(), entryId, favorite.userId, favorite.resourceId, favorite.createdAt],
    );
    statusCreated++;
  }

  let contributionCreated = 0;
  const recommendations = await q(`SELECT id, userId, resourceId, createdAt FROM Recommendation WHERE note IS NOT NULL`);
  for (const row of recommendations) {
    if (await addContribution(row.userId, "recommend", 10, "recommendation", row.id, row.createdAt)) contributionCreated++;
  }
  const comments = await q(`SELECT id, userId, createdAt FROM Comment WHERE parentId IS NULL AND resourceId IS NOT NULL`);
  for (const row of comments) {
    if (await addContribution(row.userId, "comment", 10, "comment", row.id, row.createdAt)) contributionCreated++;
  }
  const feedbacks = await q(`SELECT id, userId, createdAt FROM Feedback WHERE withdrawnAt IS NULL`);
  for (const row of feedbacks) {
    if (await addContribution(row.userId, "feedback", 2, "feedback", row.id, row.createdAt)) contributionCreated++;
  }
  const resources = await q(`SELECT id, uploaderId, createdAt FROM Resource`);
  for (const row of resources) {
    if (await addContribution(row.uploaderId, "upload", 1, "resource", row.id, row.createdAt)) contributionCreated++;
  }

  const counts = await q(`SELECT
    (SELECT COUNT(*) FROM FavoriteResource) AS favoriteCount,
    (SELECT COUNT(*) FROM ReadingStatusEntry) AS statusCount,
    (SELECT COUNT(*) FROM ContributionEntry) AS contributionCount`);
  console.log(JSON.stringify({ statusCreated, contributionCreated, counts: counts[0] }, null, 2));
  console.log(`[MIGRATE] completed; backup kept at ${backupPath}`);
})().catch((error) => {
  console.error("[MIGRATE] failed:", error);
  console.error(`[MIGRATE] rollback: pm2 stop library && cp ${backupPath} ${DB_PATH} && pm2 start library`);
  process.exit(1);
});
