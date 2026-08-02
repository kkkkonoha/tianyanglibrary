# 天央图书馆

轻小说与漫画分享社区。基于 Next.js 的全栈 Web 应用，支持资源上传分享、漫画在线阅读、社区互动。

## 功能特性

### 📚 资源分享
- QQ 号注册，管理员审核后登录
- 多文件上传（拖拽排序、图片自动压缩）、封面、标签
- 电子书（EPUB/PDF 等）在线浏览与下载
- 探索页、资源详情、评论、推荐

### 📘 漫画阅读
- 多源漫画搜索（再漫画 / 漫画柜，通过 Suwayomi 服务）
- 在线阅读器：上下滚动 / 左右翻页双模式 + 沉浸模式 + 进度记忆
- 跨源同名合并、手动合并条目、多源一键切换
- 阅读历史、继续阅读

### 👥 社区
- 动态时间线（类型筛选 + 折叠防刷屏）
- 目录（收藏夹）、资源收藏（书架）
- 通知系统（评论回复、推荐、更新提醒）
- 个人主页、头像、简介、修改用户名（每月一次）

## 技术栈

- **框架**：Next.js 16（App Router）+ React 19 + TypeScript
- **数据库**：SQLite（libsql 驱动，Prisma 7 + adapter）
- **样式**：Tailwind CSS 4 + shadcn/ui 风格组件
- **认证**：NextAuth v5（JWT，Credentials + 审核制）
- **漫画服务**：Suwayomi-Server（扩展：再漫画、漫画柜）
- **图片处理**：sharp

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 准备环境变量（.env）
DATABASE_URL="file:./dev.db"
AUTH_SECRET="任意随机字符串"

# 3. 生成 Prisma 客户端并初始化数据库
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts   # 管理员初始密码：环境变量 SEED_ADMIN_PASSWORD

# 4. 启动开发服务器
npm run dev
```

访问 `http://localhost:3000`。

> 漫画功能需要额外的 Suwayomi-Server 服务（默认 `http://127.0.0.1:4567`，可用 `SUWAYOMI_URL` 环境变量覆盖）。

## 项目结构

```
src/
├── app/            # App Router 页面与 API 路由
│   ├── comics/     # 漫画搜索、详情、阅读器
│   ├── resource/   # 资源详情、编辑
│   ├── uploads/    # 上传文件兜底静态服务
│   └── api/        # 上传、Suwayomi 代理、漫画进度等接口
├── components/     # UI 组件（时间线、评论、按钮等）
├── lib/            # 业务逻辑（认证、数据库、漫画导入、动态等）
prisma/             # 数据模型
migrations/         # 数据库迁移 SQL
scripts/            # 迁移工具脚本
```

## 更新日志

见 [CHANGELOG.md](./CHANGELOG.md)。
