# cf_email_new-webui

基于 [dreamhunter2333/cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email) 的独立前端控制台，提供一键生成临时邮箱、自动刷新邮件、智能提取验证码等功能。

## 功能特点

- **一键生成** — 随机生成临时邮箱地址，支持自定义前缀
- **多域名支持** — 自动拉取 Worker 配置的可用域名列表
- **自动刷新** — 定时轮询新邮件（默认 5 秒），验证码到手即知
- **AI 验证码识别** — 支持接入 OpenAI 兼容格式的 AI 模型，自动从邮件中提取验证码（支持中文邮件、带连字符的验证码如 `2DO-VPH`）
- **历史记录** — 本地保存用过的邮箱地址，随时切换查看
- **双模式预览** — 邮件详情支持原始邮件文本与 HTML 渲染两种查看方式
- **PowerShell 工具** — 提供 `mail-tools.ps1` 脚本，支持命令行提取验证码

## 快速开始

### 前置要求

- 已部署 [cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email) 的 Cloudflare Worker 后端
- Node.js 18+（本地运行）或 Docker（容器部署）

### 方式一：本地运行

#### 1. 克隆仓库

```bash
git clone https://github.com/Galaxy-haier/cf_email_new-webui.git
cd cf_email_new-webui
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 Cloudflare Worker 信息：

```env
# Cloudflare Worker 地址（你的后端服务地址）
WORKER_URL=https://your-worker.your-domain.workers.dev

# 管理员认证密码
ADMIN_AUTH=your-admin-password

# 默认邮箱域名
DEFAULT_DOMAIN=your-domain.com

# 服务监听端口（可选，默认 3456）
PORT=3456
```

#### 4. 启动服务

```bash
npm start
```

访问 http://localhost:3456 即可使用。

### 方式二：Docker Compose 部署

#### 1. 克隆仓库并进入目录

```bash
git clone https://github.com/Galaxy-haier/cf_email_new-webui.git
cd cf_email_new-webui
```

#### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 Cloudflare Worker 信息。

#### 3. 构建并启动容器

```bash
docker compose up -d --build
```

访问 http://localhost:3456 即可使用。

#### 常用命令

```bash
# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重启服务
docker compose restart
```

## AI 验证码识别设置

点击页面右上角的齿轮图标打开 AI 设置面板，配置以下参数：

| 配置项 | 说明 |
|--------|------|
| **启用 AI 识别** | 开启后，将自动调用 AI 提取邮件中的验证码 |
| **API 地址** | OpenAI 兼容格式的 API 地址，如 `https://api.openai.com` 或你的代理地址 |
| **API Key** | API 密钥，保存在浏览器本地 |
| **模型名称** | 如 `gpt-4o-mini`、`gemini-1.5-flash` 等，点击"获取模型列表"可自动加载可用模型 |
| **连接测试** | 点击"测试连接"可验证当前配置是否能正常调用，并显示请求延迟 |

> 注意：AI 配置保存在浏览器 localStorage 中，换设备或清除浏览器数据后需重新配置。

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
├── Dockerfile             # Docker 构建文件
├── docker-compose.yml     # Docker Compose 配置
├── .env.example           # 环境变量模板
└── package.json
```

## 环境变量说明

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `WORKER_URL` | 是 | — | Cloudflare Worker 后端地址 |
| `ADMIN_AUTH` | 是 | — | 管理员认证密码 |
| `DEFAULT_DOMAIN` | 是 | — | 默认邮箱域名 |
| `PORT` | 否 | `3456` | 服务监听端口 |

## API 文档

详见 [`cloudflare_temp_email_API/`](./cloudflare_temp_email_API/) 目录下的文档。

## 致谢

本项目前端控制台基于 [dreamhunter2333/cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email) 搭建，后端邮件收发能力由该项目的 Cloudflare Worker 提供。
