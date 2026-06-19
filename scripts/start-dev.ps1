# GlobalBridge AI — 3 servisi ayrı PowerShell pencerelerinde başlatır
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path "$Root\backend\.venv\Scripts\python.exe")) {
    Write-Host "Kurulum eksik. Once calistirin: npm run setup" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "$Root\.env")) {
    if (Test-Path "$Root\.env.example") {
        Copy-Item "$Root\.env.example" "$Root\.env"
    }
}
if (-not (Test-Path "$Root\backend\.env")) {
    if (Test-Path "$Root\.env") {
        Copy-Item "$Root\.env" "$Root\backend\.env"
    }
}

Write-Host "GlobalBridge AI servisleri baslatiliyor..." -ForegroundColor Cyan
Write-Host "  QVAC  -> http://127.0.0.1:8765"
Write-Host "  API   -> http://127.0.0.1:8000"
Write-Host "  WEB   -> http://localhost:3000"
Write-Host ""

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$Root\qvac-service'; Write-Host '[QVAC] 8765' -ForegroundColor Blue; node server.js"
)

Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$Root\backend'; Write-Host '[API] 8000' -ForegroundColor Green; .\.venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
)

Start-Sleep -Seconds 2

$env:TEMP = if ($env:TEMP) { $env:TEMP } else { "D:\temp" }
$env:TMP = $env:TEMP

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$Root\frontend'; `$env:TEMP='$($env:TEMP)'; `$env:TMP='$($env.TMP)'; Write-Host '[WEB] 3000' -ForegroundColor Magenta; npm run dev"
)

Write-Host "3 pencere acildi. Ceviri icin uc servisin de calismasi gerekir." -ForegroundColor Green
