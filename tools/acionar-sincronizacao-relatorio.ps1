param([string]$Uri)

$ErrorActionPreference = 'Stop'
$syncScript = Join-Path $PSScriptRoot 'sincronizar-relatorio-locacoes.ps1'
$logDir = Join-Path $env:LOCALAPPDATA 'CanettiLocacoes'
$logPath = Join-Path $logDir 'ultima-sincronizacao.log'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

try {
  $resultado = & $syncScript 2>&1 | Out-String
  Set-Content -LiteralPath $logPath -Value $resultado
  Add-Type -AssemblyName PresentationFramework
  [void][System.Windows.MessageBox]::Show($resultado.Trim(), 'Canetti Locacoes - Excel', 'OK', 'Information')
} catch {
  $mensagem = "Falha ao sincronizar: $($_.Exception.Message)"
  Set-Content -LiteralPath $logPath -Value $mensagem
  Add-Type -AssemblyName PresentationFramework
  [void][System.Windows.MessageBox]::Show($mensagem, 'Canetti Locacoes - Excel', 'OK', 'Error')
  exit 1
}

