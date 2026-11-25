$ErrorActionPreference = "Stop"

$domain = "https://promotion-surpass-jazz.ngrok-free.dev"
$port = 3002

Write-Host "启动 ngrok：$domain -> 127.0.0.1:$port"
ngrok http $port --url $domain
