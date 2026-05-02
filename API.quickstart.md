# 临时邮箱 API 快速记录

日期：2026-03-30

## 已验证信息

- Worker 地址：`https://linshiyouxiang.zsxh.dpdns.org`
- 匿名创建：关闭
- 管理员密码：`314119Aa`
- 有效邮箱域名：`zsxh.dpdns.org`

## 创建邮箱

请求：

```powershell
$body = @{
  enablePrefix = $true
  name = 'testnode01'
  domain = 'zsxh.dpdns.org'
} | ConvertTo-Json -Compress

Invoke-RestMethod -Method Post `
  -Uri 'https://linshiyouxiang.zsxh.dpdns.org/admin/new_address' `
  -Headers @{ 'x-admin-auth' = '314119Aa' } `
  -ContentType 'application/json' `
  -Body $body
```

已验证返回：

```json
{
  "address": "testnode01@zsxh.dpdns.org",
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoidGVzdG5vZGUwMUB6c3hoLmRwZG5zLm9yZyIsImFkZHJlc3NfaWQiOjIwfQ.S5m-I7KNrAzeT4dKTBdTi-CXCmbILkB8hyTSiol3lc4",
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
  -Uri 'https://linshiyouxiang.zsxh.dpdns.org/admin/mails?address=bd2p3a1m@zsxh.dpdns.org&limit=1&offset=0' `
  -Headers @{ 'x-admin-auth' = '314119Aa' }
```

说明：

- `address`: 目标邮箱地址
- `limit`: 拉取数量
- `offset`: 分页偏移，必填

### 按地址查看邮箱条目

```powershell
Invoke-RestMethod -Method Get `
  -Uri 'https://linshiyouxiang.zsxh.dpdns.org/admin/address?address=bd2p3a1m@zsxh.dpdns.org&limit=1&offset=0' `
  -Headers @{ 'x-admin-auth' = '314119Aa' }
```

## 从最新邮件中提取关键信息

### 直接提取验证码

适用于邮件原文 `raw` 中包含 4-8 位数字验证码的场景：

```powershell
$res = Invoke-RestMethod -Method Get `
  -Uri 'https://linshiyouxiang.zsxh.dpdns.org/admin/mails?address=bd2p3a1m@zsxh.dpdns.org&limit=1&offset=0' `
  -Headers @{ 'x-admin-auth' = '314119Aa' }

$raw = $res.results[0].raw
$code = [regex]::Match($raw, '(?<!\d)\d{4,8}(?!\d)').Value
$code
```

### 可复用 PowerShell 函数

脚本文件：`mail-tools.ps1`

导入并调用：

```powershell
. .\mail-tools.ps1
Get-LatestMailCode -Address 'bd2p3a1m@zsxh.dpdns.org'
```

返回值：

- 有验证码时直接返回验证码字符串
- 邮箱为空、原文缺失或未匹配到验证码时返回 `$null`

### 当前已验证样例

- 邮箱：`bd2p3a1m@zsxh.dpdns.org`
- 发件人：`DeepSeek <support@sc.mail.deepseek.com>`
- 主题：`DeepSeek 验证码`
- 时间：`2026-03-30 02:58:43`
- 提取结果：`760279`

### 建议提取字段

如果需要做自动化，优先提取这些字段：

- `results[0].created_at`
- `results[0].address`
- `results[0].message_id`
- `results[0].raw`
- 验证码正则：`(?<!\d)\d{4,8}(?!\d)`
