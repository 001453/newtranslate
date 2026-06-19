@echo off
setlocal enabledelayedexpansion
for %%P in (8765 8000 3000) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P" ^| findstr "LISTENING"') do (
    echo Killing PID %%A on port %%P
    taskkill /F /PID %%A >nul 2>&1
  )
)
timeout /t 2 /nobreak >nul
echo.
echo Remaining listeners:
netstat -ano | findstr "LISTENING" | findstr ":8765 :8000 :3000"
