$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  pnpm --filter api start
} finally {
  Pop-Location
}
