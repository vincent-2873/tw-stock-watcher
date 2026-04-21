# 一鍵部署：您貼完 token 後執行這個，其他我全包
# 用法（改下面的變數或讓我用 Claude Code 幫您填）：

param(
    [Parameter(Mandatory=$true)] [string]$SupabaseUrl,
    [Parameter(Mandatory=$true)] [string]$SupabaseAnonKey,
    [Parameter(Mandatory=$true)] [string]$SupabaseServiceRole,
    [Parameter(Mandatory=$true)] [string]$GitHubRepoUrl,       # https://github.com/user/tw-stock-watcher.git
    [string]$AnthropicKey = "",
    [string]$OpenAIKey = "",
    [string]$FinMindToken = "",
    [string]$FugleKey = ""
)

$ErrorActionPreference = "Stop"
$proj = "$PSScriptRoot"
Set-Location $proj

Write-Host "=== 1. 寫入 .env.local ===" -ForegroundColor Cyan
@"
NEXT_PUBLIC_SUPABASE_URL=$SupabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SupabaseAnonKey
SUPABASE_SERVICE_ROLE_KEY=$SupabaseServiceRole
ANTHROPIC_API_KEY=$AnthropicKey
OPENAI_API_KEY=$OpenAIKey
FINMIND_TOKEN=$FinMindToken
FUGLE_API_KEY=$FugleKey
"@ | Out-File "$proj\.env.local" -Encoding utf8
Write-Host "OK" -ForegroundColor Green

Write-Host "`n=== 2. 本機 build 驗證 ===" -ForegroundColor Cyan
pnpm build 2>&1 | Select-Object -Last 10
if ($LASTEXITCODE -ne 0) { throw "build 失敗，停止部署" }

Write-Host "`n=== 3. 推 GitHub ===" -ForegroundColor Cyan
$existingRemote = git remote 2>$null
if ($existingRemote -notcontains "origin") {
    git remote add origin $GitHubRepoUrl
} else {
    git remote set-url origin $GitHubRepoUrl
}
git add -A
git commit -m "chore: production env ready" --allow-empty 2>&1 | Select-Object -Last 3
git push -u origin main 2>&1 | Select-Object -Last 5
if ($LASTEXITCODE -ne 0) {
    Write-Host "push 失敗，執行 gh auth login..." -ForegroundColor Yellow
    gh auth login --web --git-protocol https
    git push -u origin main
}

Write-Host "`n=== 4. Zeabur 自動偵測 GitHub push，2 分鐘內部署完 ===" -ForegroundColor Cyan
Write-Host "請到 https://dash.zeabur.com 查看部署狀態" -ForegroundColor Yellow

Write-Host "`n=== DONE ===" -ForegroundColor Green
