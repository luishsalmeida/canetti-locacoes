param(
  [Parameter(Mandatory = $true)]
  [SecureString]$ReportSyncKey,
  [string]$ReportPath
)

$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'sincronizar-relatorio-locacoes.ps1'
$protocolScriptPath = Join-Path $PSScriptRoot 'acionar-sincronizacao-relatorio.ps1'
$buttonServerPath = Join-Path $PSScriptRoot 'servidor-botao-excel.ps1'
if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw 'O script de sincronizacao nao foi encontrado.'
}
if (-not (Test-Path -LiteralPath $protocolScriptPath)) {
  throw 'O acionador do botao de sincronizacao nao foi encontrado.'
}
if (-not (Test-Path -LiteralPath $buttonServerPath)) {
  throw 'O servidor local do botao de sincronizacao nao foi encontrado.'
}

$configDir = Join-Path $env:LOCALAPPDATA 'CanettiLocacoes'
$secretPath = Join-Path $configDir 'report-sync.key'
New-Item -ItemType Directory -Path $configDir -Force | Out-Null
$ReportSyncKey | ConvertFrom-SecureString | Set-Content -LiteralPath $secretPath -NoNewline
if ($ReportPath) {
  Set-Content -LiteralPath (Join-Path $configDir 'report-path.txt') -Value $ReportPath -NoNewline
}

$taskName = 'Canetti Locacoes - Sincronizacao do Relatorio'
$argumentos = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$comandoTarefa = "powershell.exe $argumentos"
& schtasks.exe /Create /TN $taskName /TR $comandoTarefa /SC MINUTE /MO 5 /F | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'Nao foi possivel criar a tarefa de sincronizacao.'
}

$protocolRoot = 'HKCU:\Software\Classes\canetti-sync'
New-Item -Path $protocolRoot -Force | Out-Null
Set-Item -Path $protocolRoot -Value 'URL:Canetti Locacoes - Sincronizar Excel'
New-ItemProperty -Path $protocolRoot -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
$protocolCommand = Join-Path $protocolRoot 'shell\open\command'
New-Item -Path $protocolCommand -Force | Out-Null
$commandValue = "`"powershell.exe`" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$protocolScriptPath`" `"%1`""
Set-Item -Path $protocolCommand -Value $commandValue

$buttonArguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$buttonServerPath`""
$buttonTaskCommand = "powershell.exe $buttonArguments"
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
New-Item -Path $runKey -Force | Out-Null
New-ItemProperty -Path $runKey -Name 'CanettiLocacoesExcel' -Value $buttonTaskCommand -PropertyType String -Force | Out-Null
Start-Process -FilePath 'powershell.exe' -ArgumentList $buttonArguments -WindowStyle Hidden

Write-Output 'Sincronizacao instalada. O relatorio sera verificado a cada 5 minutos e o botao Enviar para Excel esta habilitado.'

