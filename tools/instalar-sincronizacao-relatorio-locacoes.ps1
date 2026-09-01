param(
  [Parameter(Mandatory = $true)]
  [SecureString]$ReportSyncKey
)

$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'sincronizar-relatorio-locacoes.ps1'
if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw 'O script de sincronizacao nao foi encontrado.'
}

$configDir = Join-Path $env:LOCALAPPDATA 'CanettiLocacoes'
$secretPath = Join-Path $configDir 'report-sync.key'
New-Item -ItemType Directory -Path $configDir -Force | Out-Null
$ReportSyncKey | ConvertFrom-SecureString | Set-Content -LiteralPath $secretPath -NoNewline

$taskName = 'Canetti Locacoes - Sincronizacao do Relatorio'
$argumentos = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argumentos
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1)
$trigger.Repetition.Interval = (New-TimeSpan -Minutes 5)
$trigger.Repetition.Duration = (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Inclui locacoes concluidas no relatorio de locacoes 2026.' -Force | Out-Null

Write-Output 'Sincronizacao instalada. O relatorio sera verificado a cada 5 minutos enquanto este computador estiver ligado.'

