# 临时邮箱控制台

基于 [dreamhunter2333/cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email) 的独立前端控制台，提供一键生成临时邮箱、自动刷新邮件、智能提取验证码等功能。

## 功能特点

- **一键生成** — 随机生成临时邮箱地址，支持自定义前缀
- **多域名支持** — 自动拉取 Worker 配置的可用域名列表
- **自动刷新** — 定时轮询新邮件，验证码到手即知
- **智能提取** — 自动从邮件正文中识别 4-8 位数字验证码
- **历史记录** — 本地保存用过的邮箱地址，随时切换查看
- **双模式预览** — 邮件详情支持原始邮件文本与 HTML 渲染两种查看方式
- **PowerShell 工具** — 提供 `mail-tools.ps1` 脚本，支持命令行提取验证码

## 快速开始

### 1. 克隆仓库

```bash
git clone <你的仓库地址>
cd temp-mail-console
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 Cloudflare Worker 信息：

```env
WORKER_URL=https://your-worker.your-domain.workers.dev
ADMIN_AUTH=your-admin-password
DEFAULT_DOMAIN=your-domain.com
PORT=3456
```

### 4. 启动服务

```bash
npm start
```

访问 http://localhost:3456 即可使用。

## 项目结构

```
.
├── server.js              # Express 代理后端
├── public/
│   ├── index.html         # 前端页面
│   ├── app.js             # 前端逻辑
│   └── style.css          # 样式
├── cloudflare_temp_email_API/
│   ├── API.md             # API 接口文档
│   ├── API.quickstart.md  # 快速上手指南
│   └── mail-tools.ps1     # PowerShell 辅助脚本
├── .env.example           # 环境变量模板
└── package.json
```

## API 文档

详见 [`cloudflare_temp_email_API/`](./cloudflare_temp_email_API/) 目录下的文档。

## 致谢

本项目前端控制台基于 [dreamhunter2333/cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email) 搭建，后端邮件收发能力由该项目的 Cloudflare Worker 提供。
