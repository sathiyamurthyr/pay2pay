# Pay2Pay Enterprise Server Launcher
Set-Location $PSScriptRoot
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting Pay2Pay Next.js Server on port 3000...  " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan

try {
    node node_modules\next\dist\bin\next dev -p 3000
} catch {
    Write-Host "Falling back to npx next dev..." -ForegroundColor Yellow
    npx next dev -p 3000
}
