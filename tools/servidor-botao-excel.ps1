$ErrorActionPreference = 'Stop'

$mutex = New-Object System.Threading.Mutex($false, 'CanettiLocacoesExcelBridge')
if (-not $mutex.WaitOne(0, $false)) { exit 0 }

$syncScript = Join-Path $PSScriptRoot 'sincronizar-relatorio-locacoes.ps1'
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 3334)
$listener.Start()

function Send-Response($client, [int]$status, [string]$contentType, [string]$body) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $statusText = if ($status -eq 200) { 'OK' } else { 'Internal Server Error' }
  $header = "HTTP/1.1 $status $statusText`r`nContent-Type: $contentType; charset=utf-8`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
  $stream = $client.GetStream()
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  $stream.Write($bytes, 0, $bytes.Length)
  $stream.Flush()
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      while ($reader.ReadLine()) { }
      $path = if ($requestLine -match '^GET\s+([^\s]+)') { $matches[1] } else { '/' }

      if ($path -eq '/status') {
        Send-Response $client 200 'text/plain' 'Canetti Excel pronto.'
        continue
      }

      if ($path -ne '/sincronizar') {
        Send-Response $client 200 'text/plain' 'Canetti Excel pronto.'
        continue
      }

      try {
        $resultado = (& $syncScript 2>&1 | Out-String).Trim()
        $html = "<!doctype html><meta charset='utf-8'><title>Canetti Excel</title><style>body{font:18px Arial;padding:40px;background:#f8fafc;color:#172033}.box{max-width:650px;margin:auto;background:white;padding:32px;border-radius:18px;box-shadow:0 8px 30px #0002}h1{color:#16a34a}</style><div class='box'><h1>Sincronizacao concluida</h1><p>$([System.Net.WebUtility]::HtmlEncode($resultado))</p><p>Esta aba pode ser fechada.</p></div>"
        Send-Response $client 200 'text/html' $html
      } catch {
        $erro = [System.Net.WebUtility]::HtmlEncode($_.Exception.Message)
        $html = "<!doctype html><meta charset='utf-8'><title>Canetti Excel</title><style>body{font:18px Arial;padding:40px;background:#f8fafc;color:#172033}.box{max-width:650px;margin:auto;background:white;padding:32px;border-radius:18px;box-shadow:0 8px 30px #0002}h1{color:#dc2626}</style><div class='box'><h1>Falha na sincronizacao</h1><p>$erro</p><p>Feche o Excel e tente novamente.</p></div>"
        Send-Response $client 500 'text/html' $html
      }
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}

