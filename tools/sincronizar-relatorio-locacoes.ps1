param(
  [string]$ApiUrl = $(if ($env:CANETTI_API_URL) { $env:CANETTI_API_URL } else { 'https://canetti-locacoes.onrender.com/api' }),
  [string]$ReportSyncKey = $env:CANETTI_REPORT_SYNC_KEY,
  [string]$ReportPath
)

$ErrorActionPreference = 'Stop'

$syncMutex = New-Object System.Threading.Mutex($false, 'CanettiLocacoesExcelSync')
if (-not $syncMutex.WaitOne(0, $false)) {
  Write-Output 'Ja existe uma sincronizacao em andamento. Aguarde e tente novamente.'
  exit 0
}

function Write-TextCell($sheet, [int]$row, [int]$column, $value) {
  $cell = $sheet.Cells.Item($row, $column)
  try {
    $cell.Value2 = if ($null -eq $value) { '' } else { [string]$value }
  } finally {
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($cell)
  }
}

function Write-FormulaCell($sheet, [int]$row, [int]$column, [string]$formula) {
  $cell = $sheet.Cells.Item($row, $column)
  try {
    $cell.Formula = $formula
  } catch {
    throw "Falha ao gravar a formula '$formula' na celula ($row,$column): $($_.Exception.Message)"
  } finally {
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($cell)
  }
}

function FormulaNumber($value) {
  $number = if ($null -eq $value -or $value -eq '') { 0.0 } else { [double]$value }
  return $number.ToString([System.Globalization.CultureInfo]::InvariantCulture)
}

function Get-DisparoQuantidade($item, [string]$pattern) {
  if ($null -eq $item.valoresDisparo) { return $null }
  foreach ($property in $item.valoresDisparo.PSObject.Properties) {
    if ($property.Name -match $pattern -and $null -ne $property.Value -and $property.Value -ne '') {
      return [double]$property.Value
    }
  }
  return $null
}

function Find-RowByText($sheet, [int]$column, [string]$text, [int]$firstRow) {
  $lastRow = $sheet.Cells.Item($sheet.Rows.Count, $column).End(-4162).Row
  for ($row = $firstRow; $row -le $lastRow; $row++) {
    if (([string]$sheet.Cells.Item($row, $column).Value2).Trim() -eq $text) { return $row }
  }
  return $null
}

function Find-RowContaining($sheet, [int]$column, [string]$text, [int]$firstRow) {
  $lastRow = $sheet.Cells.Item($sheet.Rows.Count, $column).End(-4162).Row
  for ($row = $firstRow; $row -le $lastRow; $row++) {
    if (([string]$sheet.Cells.Item($row, $column).Value2) -match [regex]::Escape($text)) { return $row }
  }
  return $null
}

function Copy-RowStyle($sheet, [int]$sourceRow, [int]$targetRow, [string]$firstColumn, [string]$lastColumn) {
  $source = $sheet.Range("$firstColumn$sourceRow`:$lastColumn$sourceRow")
  $target = $sheet.Range("$firstColumn$targetRow`:$lastColumn$targetRow")
  try { [void]$source.Copy($target) } finally {
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($source)
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($target)
  }
}

function Set-RowDate($sheet, [int]$row, [int]$column, [datetime]$date) {
  Write-FormulaCell $sheet $row $column "=DATE($($date.Year),$($date.Month),$($date.Day))"
}

if ([string]::IsNullOrWhiteSpace($ReportSyncKey)) {
  $secretPath = Join-Path $env:LOCALAPPDATA 'CanettiLocacoes\report-sync.key'
  if (Test-Path -LiteralPath $secretPath) {
    $secureKey = Get-Content -Raw -LiteralPath $secretPath | ConvertTo-SecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    try { $ReportSyncKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  }
}
if ([string]::IsNullOrWhiteSpace($ReportSyncKey)) {
  throw 'A chave da sincronizacao nao foi configurada.'
}

$configDir = Join-Path $env:LOCALAPPDATA 'CanettiLocacoes'
if ([string]::IsNullOrWhiteSpace($ReportPath)) {
  $reportPathConfig = Join-Path $configDir 'report-path.txt'
  if (Test-Path -LiteralPath $reportPathConfig) {
    $ReportPath = (Get-Content -Raw -LiteralPath $reportPathConfig).Trim()
  }
}
$arquivo = $null
if ($ReportPath -and (Test-Path -LiteralPath $ReportPath)) {
  $arquivo = Get-Item -LiteralPath $ReportPath -ErrorAction Stop
}
if (-not $arquivo) {
  $oneDriveRoot = if ($env:OneDrive) { $env:OneDrive } else { Join-Path $env:USERPROFILE 'OneDrive' }
  $arquivo = Get-ChildItem -LiteralPath $oneDriveRoot -File -Recurse | Where-Object {
    $_.Extension -eq '.xlsx' -and
    $_.Name -notlike '~$*' -and
    $_.Name -like 'Relat*' -and
    $_.Name -like '*2026*' -and
    $_.DirectoryName -notlike '*Backup sincronizacao Canetti*'
  } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}
if (-not $arquivo) { throw 'O arquivo de relatorio de locacoes 2026 nao foi encontrado.' }
# UTF-16 includes a byte-order mark, so Windows PowerShell reads accented paths correctly.
Set-Content -LiteralPath (Join-Path $configDir 'report-path.txt') -Value $arquivo.FullName -Encoding Unicode

$resposta = Invoke-RestMethod -Uri "$($ApiUrl.TrimEnd('/'))/relatorios/locacoes-concluidas" -Headers @{ 'x-report-sync-key' = $ReportSyncKey }
$locacoes = @($resposta.locacoes)

if ($locacoes.Count -gt 0) {
  $backupDir = Join-Path $arquivo.DirectoryName 'Backup sincronizacao Canetti'
  New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
  $backupName = "Relatorio-locacoes-$((Get-Date).ToString('yyyy-MM-dd')).xlsx"
  $backupPath = Join-Path $backupDir $backupName
  if (-not (Test-Path -LiteralPath $backupPath)) {
    Copy-Item -LiteralPath $arquivo.FullName -Destination $backupPath
  }
}

$excel = $null
$workbook = $null
$vendas = $null
$premissas = $null
$resumo = $null
$dashboard = $null
$saveWorkbook = $false

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Open($arquivo.FullName, 0, $false)
  $vendas = $workbook.Worksheets.Item('Vendas')
  $premissas = $workbook.Worksheets.Item('Premissas')
  $resumo = $workbook.Worksheets.Item('Resumo Mensal')
  $dashboard = $workbook.Worksheets.Item('Dashboard')

  # Clarifies the existing cost rules without changing their configured rates.
  Write-TextCell $premissas 7 2 'Caneta - custo por unidade'
  Write-TextCell $premissas 7 4 'R$ / unidade'
  Write-TextCell $premissas 7 5 'Quantidade de caneta utilizada x R$ 0,059'
  Write-TextCell $premissas 9 2 'Sylfirm - custo por agulha'
  Write-TextCell $premissas 9 4 'R$ / agulha'
  Write-TextCell $premissas 9 5 'Agulhas utilizadas x R$ 690,00'

  # Extend the historical layout with payment method and a hidden stable sync id.
  $headerSource = $vendas.Cells.Item(5, 14)
  $headerPayment = $vendas.Cells.Item(5, 15)
  $headerSync = $vendas.Cells.Item(5, 16)
  try {
    [void]$headerSource.Copy($headerPayment)
    [void]$headerSource.Copy($headerSync)
  } finally {
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($headerSource)
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($headerPayment)
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($headerSync)
  }
  Write-TextCell $vendas 5 8 'Caneta / Agulha (un.)'
  Write-TextCell $vendas 5 14 'Recebido por'
  Write-TextCell $vendas 5 15 ''
  Write-TextCell $vendas 5 16 'ID sincronizacao'
  [void]($vendas.Columns.Item(15).Hidden = $true)
  [void]($vendas.Columns.Item(16).Hidden = $true)

  $totalRow = Find-RowContaining $vendas 2 'TOTAL' 6
  if (-not $totalRow) { throw 'A linha TOTAL DO PERIODO nao foi encontrada na aba Vendas.' }
  $lastDataRow = $totalRow - 1
  $idsExistentes = New-Object 'System.Collections.Generic.HashSet[string]'
  for ($row = 6; $row -le $lastDataRow; $row++) {
    $id = [string]$vendas.Cells.Item($row, 16).Value2
    if ($id) {
      [void]$idsExistentes.Add($id)
      $vendas.Cells.Item($row, 2).NumberFormat = 'mmm/aaaa'
      $vendas.Cells.Item($row, 3).NumberFormat = 'dd/mm/aaaa'
      Write-TextCell $vendas $row 5 (([string]$vendas.Cells.Item($row, 5).Value2) -replace '\s*-\s*[A-Za-z]{2}\s*$', '')
      $recebedorAnterior = ([string]$vendas.Cells.Item($row, 15).Value2).ToUpperInvariant()
      if ($recebedorAnterior -eq 'EMPRESA') { Write-TextCell $vendas $row 14 'Empresa' }
      if ($recebedorAnterior -eq 'DR') { Write-TextCell $vendas $row 14 'Dr Ricardo' }
      $recebedorAtual = ([string]$vendas.Cells.Item($row, 14).Value2).Trim()
      if ($recebedorAtual -match '^Dr\.?$' -or $recebedorAtual -match '^Dr\.?\s+Ricardo$') {
        Write-TextCell $vendas $row 14 'Dr Ricardo'
      }
      Write-TextCell $vendas $row 15 ''
    }
  }

  $incluidas = 0
  foreach ($locacao in $locacoes) {
    $dataLocacao = [datetime]$locacao.dataInicio
    $recebedores = @($locacao.pagamentos | ForEach-Object {
      if ($_.forma -eq 'EMPRESA') { 'Empresa' } elseif ($_.forma -eq 'DR') { 'Dr Ricardo' }
    } | Where-Object { $_ } | Select-Object -Unique) -join ' | '
    foreach ($item in @($locacao.itens)) {
      $maquina = [string]$item.equipamento.descricao
      $idSincronizacao = "LOC-$($locacao.id)-EQ-$($item.equipamentoId)"
      if ($idsExistentes.Contains($idSincronizacao)) { continue }

      $maquinaNormalizada = $maquina.ToLowerInvariant()
      $isLiftera = $maquinaNormalizada -match 'liftera'
      $isSylfirm = $maquinaNormalizada -match 'sylfirm'
      $linha = if ($isLiftera) { Get-DisparoQuantidade $item 'linear|linha' } else { 0 }
      $canetaOuAgulha = if ($isLiftera) { Get-DisparoQuantidade $item 'caneta' } elseif ($isSylfirm) { Get-DisparoQuantidade $item 'agulha' } else { 0 }
      if ($null -eq $linha) { $linha = 0 }
      if ($null -eq $canetaOuAgulha) { $canetaOuAgulha = if ($isSylfirm) { 1 } else { 0 } }

      $sourceRow = [Math]::Max(6, $totalRow - 1)
      [void]$vendas.Rows.Item($totalRow).Insert()
      Copy-RowStyle $vendas $sourceRow $totalRow 'B' 'P'

      Set-RowDate $vendas $totalRow 2 (Get-Date -Year $dataLocacao.Year -Month $dataLocacao.Month -Day 1)
      Set-RowDate $vendas $totalRow 3 $dataLocacao
      Write-TextCell $vendas $totalRow 4 $(if ($locacao.clinica.razaoSocial) { $locacao.clinica.razaoSocial } else { $locacao.clinica.nomeFantasia })
      # A planilha Vendas registra somente a cidade; a UF fica fora deste campo.
      Write-TextCell $vendas $totalRow 5 (([string]$locacao.cidadeLocacao) -replace '\s*-\s*[A-Za-z]{2}\s*$', '')
      Write-TextCell $vendas $totalRow 6 $maquina
      Write-FormulaCell $vendas $totalRow 7 "=$(FormulaNumber $linha)"
      Write-FormulaCell $vendas $totalRow 8 "=$(FormulaNumber $canetaOuAgulha)"
      Write-FormulaCell $vendas $totalRow 9 '=1'
      Write-FormulaCell $vendas $totalRow 10 "=$(FormulaNumber $item.valorDiaria)"
      if ($isSylfirm) {
        Write-FormulaCell $vendas $totalRow 11 "=J$totalRow"
        Write-FormulaCell $vendas $totalRow 12 "=H$totalRow*Premissas!`$C`$9"
      } elseif ($isLiftera) {
        Write-FormulaCell $vendas $totalRow 11 "=(G$totalRow*Premissas!`$C`$10)+(H$totalRow*Premissas!`$C`$11)+`$J$totalRow"
        Write-FormulaCell $vendas $totalRow 12 "=(H$totalRow*TX_CANETA)+(G$totalRow*TX_LINHA)"
      } else {
        Write-FormulaCell $vendas $totalRow 11 "=J$totalRow"
        Write-FormulaCell $vendas $totalRow 12 '=0'
      }
      Write-FormulaCell $vendas $totalRow 13 "=K$totalRow-L$totalRow"
      Write-TextCell $vendas $totalRow 14 $recebedores
      Write-TextCell $vendas $totalRow 15 ''
      Write-TextCell $vendas $totalRow 16 $idSincronizacao
      $vendas.Cells.Item($totalRow, 2).NumberFormat = 'mmm/aaaa'
      $vendas.Cells.Item($totalRow, 3).NumberFormat = 'dd/mm/aaaa'
      $vendas.Range("J$totalRow:M$totalRow").NumberFormat = 'R$ #,##0.00'

      [void]$idsExistentes.Add($idSincronizacao)
      $incluidas++
      $totalRow++
    }
  }

  $lastDataRow = $totalRow - 1
  foreach ($column in @(7, 8, 9, 11, 12, 13)) {
    $letter = [char](64 + $column)
    Write-FormulaCell $vendas $totalRow $column "=SUBTOTAL(109,${letter}6:${letter}${lastDataRow})"
  }
  $vendas.Range("B6:P$lastDataRow").VerticalAlignment = -4108
  $vendas.Range("B6:P$lastDataRow").WrapText = $true

  # Keep monthly summary dates and formulas extensible as new months are synchronized.
  $summaryTotalRow = Find-RowByText $resumo 2 'TOTAL' 6
  if (-not $summaryTotalRow) { throw 'A linha TOTAL nao foi encontrada em Resumo Mensal.' }
  $competencias = New-Object 'System.Collections.Generic.SortedSet[string]'
  for ($row = 6; $row -le $lastDataRow; $row++) {
    $value = $vendas.Cells.Item($row, 2).Value2
    if ($value -is [double] -or $value -is [int]) { [void]$competencias.Add(([datetime]::FromOADate([double]$value)).ToString('yyyy-MM-01')) }
  }
  $existentesResumo = New-Object 'System.Collections.Generic.HashSet[string]'
  for ($row = 6; $row -lt $summaryTotalRow; $row++) {
    $value = $resumo.Cells.Item($row, 2).Value2
    if ($value -is [double] -or $value -is [int]) { [void]$existentesResumo.Add(([datetime]::FromOADate([double]$value)).ToString('yyyy-MM-01')) }
  }
  foreach ($competencia in $competencias) {
    if ($existentesResumo.Contains($competencia)) { continue }
    $sourceRow = [Math]::Max(6, $summaryTotalRow - 1)
    [void]$resumo.Rows.Item($summaryTotalRow).Insert()
    Copy-RowStyle $resumo $sourceRow $summaryTotalRow 'B' 'O'
    Set-RowDate $resumo $summaryTotalRow 2 ([datetime]$competencia)
    $summaryTotalRow++
  }
  $lastSummaryRow = $summaryTotalRow - 1
  for ($row = 6; $row -le $lastSummaryRow; $row++) {
    Write-FormulaCell $resumo $row 3 "=SUMIFS(Vendas!`$G`$6:`$G`$$lastDataRow,Vendas!`$B`$6:`$B`$$lastDataRow,`$B$row)"
    Write-FormulaCell $resumo $row 4 "=SUMIFS(Vendas!`$H`$6:`$H`$$lastDataRow,Vendas!`$B`$6:`$B`$$lastDataRow,`$B$row)"
    Write-FormulaCell $resumo $row 5 "=SUMIFS(Vendas!`$I`$6:`$I`$$lastDataRow,Vendas!`$B`$6:`$B`$$lastDataRow,`$B$row)"
    Write-FormulaCell $resumo $row 6 "=(C$row*1.2)+(D$row*0.25)"
    Write-FormulaCell $resumo $row 7 "=(C$row*0.96)+(D$row*0.059)"
    Write-FormulaCell $resumo $row 8 "=SUM(F$row-G$row)"
    Write-FormulaCell $resumo $row 9 $(if ($row -eq 6) { '' } else { "=H$row/H$($row - 1)-1" })
    Write-FormulaCell $resumo $row 10 "=H$row/`$H`$$summaryTotalRow"
    Write-FormulaCell $resumo $row 12 "=TEXT(B$row,`"mmm/aa`")"
  }
  foreach ($column in 3..10) {
    $letter = [char](64 + $column)
    Write-FormulaCell $resumo $summaryTotalRow $column "=SUM(${letter}6:${letter}${lastSummaryRow})"
  }
  Write-TextCell $resumo $summaryTotalRow 2 'TOTAL'
  Write-FormulaCell $resumo 6 15 "=`$F`$$summaryTotalRow"
  Write-FormulaCell $resumo 7 15 "=`$G`$$summaryTotalRow"
  Write-FormulaCell $resumo 8 15 "=`$E`$$summaryTotalRow"

  # Dashboard cards keep their existing positions while their source ranges expand.
  Write-FormulaCell $dashboard 10 2 "='Resumo Mensal'!`$H`$$summaryTotalRow"
  Write-FormulaCell $dashboard 10 12 "='Resumo Mensal'!G$summaryTotalRow/'Resumo Mensal'!E$summaryTotalRow"
  Write-FormulaCell $dashboard 10 17 "=PROPER(TEXT(INDEX('Resumo Mensal'!`$B`$6:`$B`$$lastSummaryRow,MATCH(MAX('Resumo Mensal'!`$H`$6:`$H`$$lastSummaryRow),'Resumo Mensal'!`$H`$6:`$H`$$lastSummaryRow,0)),`"mmmm`"))"
  Write-FormulaCell $dashboard 11 17 "=TEXT(MAX('Resumo Mensal'!`$H`$6:`$H`$$lastSummaryRow),`"R$ #.##0,00`")"
  Write-FormulaCell $dashboard 15 2 "='Resumo Mensal'!`$D`$$summaryTotalRow"
  Write-FormulaCell $dashboard 15 7 "='Resumo Mensal'!`$C`$$summaryTotalRow"
  Write-FormulaCell $dashboard 15 12 "='Resumo Mensal'!`$E`$$summaryTotalRow"
  $monthCount = [Math]::Max(1, $lastSummaryRow - 5)
  Write-FormulaCell $dashboard 15 17 "='Resumo Mensal'!`$H`$$summaryTotalRow/$monthCount"
  $used = $dashboard.UsedRange
  for ($row = 1; $row -le $used.Rows.Count; $row++) {
    for ($column = 1; $column -le $used.Columns.Count; $column++) {
      $cell = $dashboard.Cells.Item($row, $column)
      $formula = [string]$cell.Formula
      if ($formula -match 'Vendas!.*\$39') { $cell.Formula = $formula.Replace('$39', ('$' + $lastDataRow)) }
    }
  }

  $workbook.Save()
  $saveWorkbook = $true
  Write-Output "Sincronizacao concluida: $incluidas nova(s) linha(s) incluida(s) na aba Vendas."
} finally {
  if ($workbook) { $workbook.Close($saveWorkbook) }
  if ($excel) { $excel.Quit() }
  if ($dashboard) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($dashboard) }
  if ($resumo) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($resumo) }
  if ($premissas) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($premissas) }
  if ($vendas) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($vendas) }
  if ($workbook) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) }
  if ($excel) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  $syncMutex.ReleaseMutex()
  $syncMutex.Dispose()
}

