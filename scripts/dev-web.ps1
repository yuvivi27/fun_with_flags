# Free port 3000 (Windows) then start the Next.js web app.
$ErrorActionPreference = "SilentlyContinue"
Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object {
  Stop-Process -Id $_.OwningProcess -Force
}
Set-Location $PSScriptRoot/..
pnpm --filter web dev
