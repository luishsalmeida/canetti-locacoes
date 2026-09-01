$ErrorActionPreference = 'Stop'

$configDir = Join-Path $env:LOCALAPPDATA 'CanettiLocacoes'
$resultPath = Join-Path $configDir 'resultado-botao-excel.txt'
$lockPath = Join-Path $configDir 'sincronizacao-em-andamento.lock'
$syncScript = Join-Path $PSScriptRoot 'sincronizar-relatorio-locacoes.ps1'
New-Item -ItemType Directory -Path $configDir -Force | Out-Null
$stdoutPath = Join-Path $configDir 'sync-stdout.tmp'
$stderrPath = Join-Path $configDir 'sync-stderr.tmp'

try {
  Set-Content -LiteralPath $lockPath -Value $PID -NoNewline
  Set-Content -LiteralPath $resultPath -Value 'Executando sincronizacao...'
  Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$syncScript`""
  # A PowerShell 7 parent can expose incompatible modules to Windows PowerShell.
  # Start the worker with only the native Windows PowerShell module locations.
  $previousPsModulePath = $env:PSModulePath
  $env:PSModulePath = @(
    (Join-Path $env:USERPROFILE 'Documents\WindowsPowerShell\Modules'),
    (Join-Path $env:ProgramFiles 'WindowsPowerShell\Modules'),
    (Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\Modules')
  ) -join ';'
  try {
    $process = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
  } finally {
    $env:PSModulePath = $previousPsModulePath
  }
  if (-not $process.WaitForExit(90000)) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    Set-Content -LiteralPath $resultPath -Value 'A sincronizacao excedeu 90 segundos. Feche o Excel e tente novamente.'
  } else {
    # Ensure redirected output is completely flushed before reading the files.
    $process.WaitForExit()
    $stdout = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -Raw -LiteralPath $stdoutPath } else { '' }
    $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -Raw -LiteralPath $stderrPath } else { '' }
    if ($null -eq $stdout) { $stdout = '' } else { $stdout = $stdout.Trim() }
    if ($null -eq $stderr) { $stderr = '' } else { $stderr = $stderr.Trim() }
    $completedSuccessfully = ($process.ExitCode -eq 0) -or (
      [string]::IsNullOrWhiteSpace([string]$process.ExitCode) -and
      -not [string]::IsNullOrWhiteSpace($stdout) -and
      [string]::IsNullOrWhiteSpace($stderr)
    )
    if ($completedSuccessfully) {
      if ([string]::IsNullOrWhiteSpace($stdout)) { $stdout = 'Sincronizacao concluida.' }
      Set-Content -LiteralPath $resultPath -Value $stdout
    } else {
      $details = if ($stderr) { $stderr } elseif ($stdout) { $stdout } else { 'O processo terminou sem informar detalhes.' }
      Set-Content -LiteralPath $resultPath -Value "Falha ao sincronizar (codigo $($process.ExitCode)): $details"
    }
  }
} catch {
  Set-Content -LiteralPath $resultPath -Value "Falha ao sincronizar (linha $($_.InvocationInfo.ScriptLineNumber)): $($_.Exception.Message)"
} finally {
  Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue
}

