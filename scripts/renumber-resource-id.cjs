// Resource.id 重排为连续（消除历史空洞，如 16→10000 跳号）
// 原理：所有引用表 FK 均带 ON UPDATE CASCADE，两阶段 UPDATE 主键即可级联更新。
// 阶段1：id → -id（临时负值，避免新旧值交叉冲突）
// 阶段2：-id → 新连续值 1..N（按 createdAt, rowid 顺序编号）
// 执行：pm2 stop library && node scripts/renumber-resource-id.cjs && pm2 start library
// 回退：pm2 stop library && cp dev.db.renumber-prebak-* dev.db && pm2 start library
const { createClient } = require("/root/library/node_modules/@libsql/client");
const { execSync } = require("child_process");
const path = require("path");

const DB_PATH = "/root/library/dev.db";
const PREBAK = `/root/library/dev.db.renumber-prebak-${Date.now()}`;
execSync(`cp ${DB_PATH} ${PREBAK}`);
console.log("[RENUMBER] 备份:", path.basename(PREBAK));

const db = createClient({ url: `file:${DB_PATH}` });
const exec = async (sql, args) => { await db.execute({ sql, args }); };
const q = async (sql, args) => (await db.execute({ sql, args })).rows;

(async () => {
  try {
    await exec("PRAGMA foreign_keys=ON");

    const before = (await q(`SELECT COUNT(*) AS c FROM "Resource"`))[0].c;
    console.log("[RENUMBER] 资源总数:", before);

    await exec(`CREATE TABLE "_RidMap" ("old" INTEGER PRIMARY KEY, "new" INTEGER NOT NULL)`);
    await exec(`INSERT INTO "_RidMap" ("old","new") SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt","rowid") FROM "Resource"`);
    const mapCount = (await q(`SELECT COUNT(*) AS c FROM "_RidMap"`))[0].c;
    console.log("[RENUMBER] 映射条数:", mapCount);

    const rows = await q(`SELECT "id" FROM "Resource"`);
    for (const r of rows) {
      await exec(`UPDATE "Resource" SET "id" = ? WHERE "id" = ?`, [-r.id, r.id]);
    }
    console.log("[RENUMBER] 阶段1 完成（临时负值）");

    const plan = await q(`SELECT m."old", m."new" FROM "_RidMap" m ORDER BY m."new"`);
    for (const p of plan) {
      await exec(`UPDATE "Resource" SET "id" = ? WHERE "id" = ?`, [p.new, -p.old]);
    }
    console.log("[RENUMBER] 阶段2 完成（新连续值）");

    await exec(`UPDATE "sqlite_sequence" SET "seq" = ? WHERE "name" = 'Resource'`, [mapCount]);
    await exec(`DROP TABLE "_RidMap"`);

    // ===== 校验 =====
    console.log("\n===== 校验 =====");
    const after = (await q(`SELECT COUNT(*) AS c FROM "Resource"`))[0].c;
    console.log("Resource 总数:", after, after === before ? "✓" : "✗");
    const seq = (await q(`SELECT "seq" FROM "sqlite_sequence" WHERE "name"='Resource'`))[0].seq;
    const maxId = (await q(`SELECT MAX("id") AS m FROM "Resource"`))[0].m;
    console.log("seq:", seq, "max(id):", maxId, seq === maxId && maxId === after ? "✓" : "✗");
    const gapCheck = await q(`SELECT COUNT(*) AS c FROM (SELECT "id" - LAG("id") OVER (ORDER BY "id") AS d FROM "Resource") WHERE d IS NOT NULL AND d <> 1`);
    console.log("非连续间隔数:", gapCheck[0].c === 0 ? "✓ 完全连续" : `✗ 有 ${gapCheck[0].c} 处`);
    const ids = await q(`SELECT "id", "title" FROM "Resource" ORDER BY "id"`);
    ids.forEach((r) => console.log(`  ${r.id}: ${r.title}`));

    const refTables = ["ResourceTag", "ResourceFile", "ComicBinding", "Comment", "Recommendation", "CollectionResource", "Activity", "FavoriteResource"];
    for (const t of refTables) {
      const orphan = (await q(`SELECT COUNT(*) AS c FROM "${t}" o WHERE o."resourceId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Resource" r WHERE r."id" = o."resourceId")`))[0].c;
      const cnt = (await q(`SELECT COUNT(*) AS c FROM "${t}"`))[0].c;
      console.log(`${t}: ${cnt} 行${orphan > 0 ? `，孤儿 ${orphan} ✗` : "，引用完整 ✓"}`);
    }
    console.log("\n[RENUMBER] 完成。");
    process.exit(0);
  } catch (e) {
    console.error("[RENUMBER] 失败:", e.message);
    console.error(`回退：pm2 stop library && cp ${PREBAK} ${DB_PATH} && pm2 start library`);
    process.exit(1);
  }
})();
