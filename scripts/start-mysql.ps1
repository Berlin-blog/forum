$ErrorActionPreference = "Stop"

$base = "C:\Program Files\MySQL\MySQL Server 8.4"
$root = Split-Path -Parent $PSScriptRoot
$data = Join-Path $root "data\mysql"
$mysqld = Join-Path $base "bin\mysqld.exe"
$mysql = Join-Path $base "bin\mysql.exe"

if (-not (Test-Path -LiteralPath $mysqld)) {
  throw "找不到 MySQL：$mysqld"
}

$listener = Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  Write-Host "MySQL 已在 127.0.0.1:3307 运行。"
  exit 0
}

if (-not (Test-Path -LiteralPath (Join-Path $data "mysql"))) {
  New-Item -ItemType Directory -Force -Path $data | Out-Null
  Write-Host "初始化项目 MySQL 数据目录：$data"
  & $mysqld --no-defaults --initialize-insecure --basedir="$base" --datadir="$data" --log-error="$root\data\mysql-init.log"
  if ($LASTEXITCODE -ne 0) { throw "MySQL 初始化失败，见 data\mysql-init.log" }
}

$argString = "--no-defaults --basedir=`"$base`" --datadir=`"$data`" --port=3307 --bind-address=127.0.0.1 --mysqlx-port=33070 --log-error=`"$root\data\mysql-error.log`" --pid-file=`"$root\data\mysql.pid`""
Start-Process -FilePath $mysqld -ArgumentList $argString -WindowStyle Hidden | Out-Null

$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $client.Connect("127.0.0.1", 3307)
    $client.Close()
    $ready = $true
    break
  } catch {
    Start-Sleep -Milliseconds 500
  } finally {
    $client.Dispose()
  }
}
if (-not $ready) { throw "MySQL 启动超时，见 data\mysql-error.log" }

$sql = @"
CREATE DATABASE IF NOT EXISTS forum CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'forum'@'127.0.0.1' IDENTIFIED BY 'forum_dev_password';
GRANT ALL PRIVILEGES ON forum.* TO 'forum'@'127.0.0.1';
FLUSH PRIVILEGES;
"@
$sql | & $mysql --protocol=TCP -h 127.0.0.1 -P 3307 -u root --default-character-set=utf8mb4
if ($LASTEXITCODE -ne 0) { throw "创建数据库失败" }

Write-Host "MySQL 已启动：127.0.0.1:3307，数据库 forum"
