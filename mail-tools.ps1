function Get-LatestMailCode {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Address
    )

    $workerBaseUrl = 'https://linshiyouxiang.zsxh.dpdns.org'
    $adminAuth = '314119Aa'

    $encodedAddress = [System.Uri]::EscapeDataString($Address)
    $uri = "$workerBaseUrl/admin/mails?address=$encodedAddress&limit=1&offset=0"

    try {
        $response = Invoke-RestMethod -Method Get -Uri $uri -Headers @{
            'x-admin-auth' = $adminAuth
        }
    }
    catch {
        throw "Failed to fetch mails for $Address. $($_.Exception.Message)"
    }

    if (-not $response.results -or $response.results.Count -eq 0) {
        return $null
    }

    $raw = $response.results[0].raw
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return $null
    }

    $patterns = @(
        '(?is)(?:验证码|verification code)[^0-9]{0,80}(?<code>\d{4,8})',
        '(?is)(?<code>\d{4,8})[^0-9]{0,40}(?:5天内有效|valid)',
        '(?m)^\s*(?<code>\d{4,8})\s*$'
    )

    foreach ($pattern in $patterns) {
        $match = [regex]::Match($raw, $pattern)
        if ($match.Success) {
            return $match.Groups['code'].Value
        }
    }

    return $null
}
