# 临时邮箱 API 快速记录

## 配置说明

使用前请先在项目根目录创建 `.env` 文件，参考 `.env.example` 填入你的实际配置：

```env
WORKER_URL=https://your-worker.your-domain.workers.dev
ADMIN_AUTH=your-admin-password
DEFAULT_DOMAIN=your-domain.com
```

## 已验证信息

- Worker 地址：`https://<your-worker>`
- 匿名创建：关闭
- 管理员密码：`<your-admin-password>`
- 有效邮箱域名：`<your-domain>`

## 创建邮箱

请求：

```powershell
$body = @{
  enablePrefix = $true
  name = 'testnode01'
  domain = '<your-domain>'
} | ConvertTo-Json -Compress

Invoke-RestMethod -Method Post `
  -Uri 'https://<your-worker>/admin/new_address' `
  -Headers @{ 'x-admin-auth' = '<your-admin-password>' } `
  -ContentType 'application/json' `
  -Body $body
```

已验证返回：

```json
{
  "address": "testnode01@your-domain.com",
  "jwt": "eyJhbGciOiJIUzI1NiIs...",
  "password": null
}
```

## 读取邮件

- 使用 `Authorization: Bearer <address jwt>`
- 可访问 `/api/*` 接口
- 具体读信端点待探测确认

## 已验证读信接口

### 按地址读取最新邮件

管理员接口可直接按地址读取邮件列表：

```powershell
Invoke-RestMethod -Method Get `
  -Uri 'https://<your-worker>/admin/mails?address=test@your-domain.com&limit=1&offset=0' `
  -Headers @{ 'x-admin-auth' = '<your-admin-password>' }
```

说明：

- `address`: 目标邮箱地址
- `limit`: 拉取数量
- `offset`: 分页偏移，必填

### 按地址查看邮箱条目

```powershell
Invoke-RestMethod -Method Get `
  -Uri 'https://<your-worker>/admin/address?address=test@your-domain.com&limit=1&offset=0' `
  -Headers @{ 'x-admin-auth' = '<your-admin-password>' }
```

## 从最新邮件中提取关键信息

### 直接提取验证码

适用于邮件原文 `raw` 中包含 4-8 位数字验证码的场景：

```powershell
$res = Invoke-RestMethod -Method Get `
  -Uri 'https://<your-worker>/admin/mails?address=test@your-domain.com&limit=1&offset=0' `
  -Headers @{ 'x-admin-auth' = '<your-admin-password>' }

$raw = $res.results[0].raw
$code = [regex]::Match($raw, '(?<!\d)\d{4,8}(?!\d)').Value
$code
```

### 可复用 PowerShell 函数

脚本文件：`mail-tools.ps1`

导入并调用：

```powershell
. .\mail-tools.ps1
Get-LatestMailCode -Address 'test@your-domain.com' -WorkerBaseUrl 'https://<your-worker>' -AdminAuth '<your-admin-password>'
```

返回值：

- 有验证码时直接返回验证码字符串
- 邮箱为空、原文缺失或未匹配到验证码时返回 `$null`

### 当前已验证样例

- 邮箱：`test@your-domain.com`
- 发件人：`DeepSeek <support@sc.mail.deepseek.com>`
- 主题：`DeepSeek 验证码`
- 提取结果：`760279`（示例）

### 建议提取字段

如果需要做自动化，优先提取这些字段：

- `results[0].created_at`
- `results[0].address`
- `results[0].message_id`
- `results[0].raw`
- 验证码正则：`(?<!\d)\d{4,8}(?!\d)`
