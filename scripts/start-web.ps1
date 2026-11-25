$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  pnpm --filter web dev --host 127.0.0.1
} finally {
  Pop-Location
}
