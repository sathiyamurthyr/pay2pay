@echo off
title Pay2Pay Enterprise Frontend Server
cd /d "%~dp0"
echo ===================================================
echo   Starting Pay2Pay Next.js Server on port 3000...
echo ===================================================
node node_modules\next\dist\bin\next dev -p 3000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Node direct launcher failed. Falling back to npx...
    npx next dev -p 3000
)
pause
