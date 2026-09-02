$ErrorActionPreference = 'Stop'

$mutex = New-Object System.Threading.Mutex($false, 'CanettiLocacoesExcelBridgeV2')
if (-not $mutex.WaitOne(0, $false)) { exit 0 }

$backgroundScript = Join-Path $PSScriptRoot 'sincronizar-relatorio-background.ps1'
$configDir = Join-Path $env:LOCALAPPDATA 'CanettiLocacoes'
$resultPath = Join-Path $configDir 'resultado-botao-excel.txt'
$lockPath = Join-Path $configDir 'sincronizacao-em-andamento.lock'
New-Item -ItemType Directory -Path $configDir -Force | Out-Null
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 3335)
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

      if ($path -like '/resultado*') {
        $resultadoAtual = if (Test-Path -LiteralPath $resultPath) { Get-Content -Raw -LiteralPath $resultPath } else { 'Aguardando...' }
        Send-Response $client 200 'text/plain' $resultadoAtual
        continue
      }

      if ($path -ne '/sincronizar') {
        Send-Response $client 200 'text/plain' 'Canetti Excel pronto.'
        continue
      }

      $executando = $false
      if (Test-Path -LiteralPath $lockPath) {
        $syncPid = [int](Get-Content -Raw -LiteralPath $lockPath)
        $executando = $null -ne (Get-Process -Id $syncPid -ErrorAction SilentlyContinue)
        if (-not $executando) { Remove-Item -LiteralPath $lockPath -Force }
      }
      if (-not $executando) {
        Set-Content -LiteralPath $resultPath -Value 'Executando sincronizacao...'
        Start-Process -FilePath 'powershell.exe' -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$backgroundScript`"" -WindowStyle Hidden
      }

      $html = @'
<!doctype html><meta charset="utf-8"><title>Canetti Excel</title>
<style>body{font:18px Arial;padding:40px;background:#f8fafc;color:#172033}.box{max-width:650px;margin:auto;background:white;padding:32px;border-radius:18px;box-shadow:0 8px 30px #0002}h1{color:#4f46e5}.status{padding:18px;background:#eef2ff;border-radius:12px;white-space:pre-wrap}</style>
<div class="box"><h1 id="titulo">Enviando para o Excel</h1><div id="status" class="status">Executando sincronizacao...</div><p id="orientacao">A pagina atualiza automaticamente. Nao clique novamente.</p></div>
<script>
async function atualizar(){try{const texto=await fetch('/resultado?'+Date.now()).then(r=>r.text());document.getElementById('status').textContent=texto;if(!texto.startsWith('Executando')){clearInterval(timer);const sucesso=texto.startsWith('Sincronizacao concluida');document.getElementById('titulo').textContent=sucesso?'Concluido':'Atencao';document.getElementById('orientacao').textContent=sucesso?'Esta aba sera fechada automaticamente.':'Corrija o problema informado e tente novamente.';if(sucesso)setTimeout(()=>window.close(),2500)}}catch(e){document.getElementById('status').textContent='Aguardando o sincronizador local...' }}
const timer=setInterval(atualizar,1500);atualizar();
</script>
'@
      Send-Response $client 200 'text/html' $html
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}

