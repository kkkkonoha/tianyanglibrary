// 反馈汇总文档生成：读取 Feedback 表中未整合的记录，生成 Markdown 追加到 feedback-reports/
// 由 cron 每 6 小时执行：node /root/library/scripts/feedback-report.cjs
const { createClient } = require("/root/library/node_modules/@libsql/client");
const fs = require("fs");
const path = require("path");

const DB = "file:/root/library/dev.db";
const REPORT_DIR = "/root/library/feedback-reports";
const MARK_FILE = path.join(REPORT_DIR, ".last-export-id");
const INTERVAL_MS = 6 * 60 * 60 * 1000;

const db = createClient({ url: DB });
const q = async (sql, args) => (await db.execute({ sql, args })).rows;

const TYPE_LABEL = { BUG: "🐞 Bug", FEATURE: "✨ 功能需求" };
const STATUS_LABEL = { pending: "待处理", processing: "处理中", done: "已处理" };

(async () => {
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  // 取上次导出位置（用时间戳，兼容老数据）
  let lastTime = 0;
  try { lastTime = parseInt(fs.readFileSync(MARK_FILE, "utf8"), 10) || 0; } catch {}

  const cutoff = new Date(lastTime || Date.now() - INTERVAL_MS).toISOString().replace("T", " ").slice(0, 19);
  const rows = await q(
    `SELECT f.id, f.type, f.title, f.content, f.status, f.reply, f.withdrawnAt, f.createdAt, u.username
     FROM Feedback f JOIN User u ON u.id = f.userId
     WHERE f.createdAt > ? ORDER BY f.createdAt ASC`,
    [cutoff]
  );

  if (rows.length === 0) {
    console.log(`[feedback-report] 无新反馈（自 ${cutoff}）`);
    process.exit(0);
  }

  const now = new Date();
  const filename = `反馈汇总-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.md`;
  const filePath = path.join(REPORT_DIR, filename);

  let md = `# 天央图书馆反馈汇总\n\n- 生成时间：${now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}\n- 本次新增：${rows.length} 条（含已撤回）\n\n`;
  md += `| # | 时间 | 提交者 | 类型 | 标题 | 状态 |\n|---|------|--------|------|------|------|\n`;
  rows.forEach((r, i) => {
    const statusText = r.withdrawnAt ? "已撤回" : STATUS_LABEL[r.status] ?? r.status;
    md += `| ${i + 1} | ${new Date(r.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} | ${r.username} | ${TYPE_LABEL[r.type] ?? r.type} | ${r.title} | ${statusText} |\n`;
  });
  md += `\n---\n\n`;
  for (const r of rows) {
    const withdrawnMark = r.withdrawnAt ? "（已撤回）" : "";
    md += `## ${TYPE_LABEL[r.type] ?? r.type}：${r.title}${withdrawnMark}\n\n`;
    md += `- 提交者：${r.username}\n`;
    md += `- 时间：${new Date(r.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}\n`;
    md += `- 状态：${r.withdrawnAt ? "已撤回" : STATUS_LABEL[r.status] ?? r.status}\n\n`;
    md += `**内容：**\n\n${r.content}\n\n`;
    if (r.reply) md += `**管理员回复：**\n\n${r.reply}\n\n`;
    md += `---\n\n`;
  }

  fs.writeFileSync(filePath, md, "utf8");
  // 记录最新一条反馈时间作为下次增量起点
  const maxTime = rows[rows.length - 1].createdAt;
  fs.writeFileSync(MARK_FILE, String(new Date(maxTime).getTime()), "utf8");

  console.log(`[feedback-report] 已生成 ${filename}（${rows.length} 条）`);
  process.exit(0);
})().catch((e) => { console.error("[feedback-report] 失败:", e.message); process.exit(1); });
