param(
  [string]$ApiUrl = $(if ($env:CANETTI_API_URL) { $env:CANETTI_API_URL } else { 'https://canetti-locacoes.onrender.com/api' }),
  [string]$ReportSyncKey = $env:CANETTI_REPORT_SYNC_KEY,
  [string]$ReportPath,
  [switch]$RefreshDashboard
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

function Write-Formula2Cell($sheet, [int]$row, [int]$column, [string]$formula) {
  $cell = $sheet.Cells.Item($row, $column)
  try {
    $cell.Formula2 = $formula
  } catch {
    throw "Falha ao gravar a formula dinamica '$formula' na celula ($row,$column): $($_.Exception.Message)"
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

# O Excel pode encerrar o processo COM antes da limpeza (por exemplo, depois de
# salvar uma planilha com recalculo pesado). A sincronizacao ja concluida nao
# deve ser marcada como falha apenas porque a sessao COM caiu ao ser encerrada.
function Release-ComObjectSafely($comObject) {
  if ($null -eq $comObject) { return }
  try {
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($comObject)
  } catch {
    # Nenhuma acao: o objeto ja foi liberado pelo Excel.
  }
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

$reportStream = $null
try {
  $reportStream = [System.IO.File]::Open($arquivo.FullName, 'Open', 'ReadWrite', 'None')
} catch {
  throw 'Feche o arquivo do Excel antes de enviar os dados e tente novamente.'
} finally {
  if ($reportStream) { $reportStream.Dispose() }
}

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
$custoLinhaLiftera = 0.96
$custoCanetaLiftera = 0.059

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
  # Remove stale synchronization ids accidentally left on the totals row or below it.
  $lastSyncIdRow = $vendas.Cells.Item($vendas.Rows.Count, 16).End(-4162).Row
  for ($row = $totalRow; $row -le $lastSyncIdRow; $row++) {
    if ([string]$vendas.Cells.Item($row, 16).Value2) { Write-TextCell $vendas $row 16 '' }
  }
  $idsExistentes = New-Object 'System.Collections.Generic.HashSet[string]'
  $linhasPorId = @{}
  for ($row = 6; $row -le $lastDataRow; $row++) {
    $id = [string]$vendas.Cells.Item($row, 16).Value2
    if ($id) {
      [void]$idsExistentes.Add($id)
      $linhasPorId[$id] = $row
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
    $itensLocacao = @($locacao.itens)
    $pagamentosRecebidos = @($locacao.pagamentos | Where-Object { $_.status -eq 'RECEBIDO' })
    $valorRecebidoTotal = [double](($pagamentosRecebidos | Measure-Object -Property valor -Sum).Sum)
    $totalDiarias = [double](($itensLocacao | Measure-Object -Property valorDiaria -Sum).Sum)
    $valorRecebidoAlocado = 0.0
    $indiceItem = 0
    foreach ($item in $itensLocacao) {
      $maquina = [string]$item.equipamento.descricao
      $idSincronizacao = "LOC-$($locacao.id)-EQ-$($item.equipamentoId)"

      $maquinaNormalizada = $maquina.ToLowerInvariant()
      $isLiftera = $maquinaNormalizada -match 'liftera'
      $isSylfirm = $maquinaNormalizada -match 'sylfirm'
      $linha = if ($isLiftera) { Get-DisparoQuantidade $item 'linear|linha' } else { 0 }
      $canetaOuAgulha = if ($isLiftera) { Get-DisparoQuantidade $item 'caneta' } elseif ($isSylfirm) { Get-DisparoQuantidade $item 'agulha' } else { 0 }
      if ($null -eq $linha) { $linha = 0 }
      if ($null -eq $canetaOuAgulha) { $canetaOuAgulha = if ($isSylfirm) { 1 } else { 0 } }

      $valorBrutoRecebido = $null
      if ($valorRecebidoTotal -gt 0 -and $itensLocacao.Count -gt 0) {
        if ($indiceItem -eq ($itensLocacao.Count - 1)) {
          $valorBrutoRecebido = [Math]::Round($valorRecebidoTotal - $valorRecebidoAlocado, 2)
        } elseif ($totalDiarias -gt 0) {
          $valorBrutoRecebido = [Math]::Round($valorRecebidoTotal * ([double]$item.valorDiaria / $totalDiarias), 2)
        } else {
          $valorBrutoRecebido = [Math]::Round($valorRecebidoTotal / $itensLocacao.Count, 2)
        }
        $valorRecebidoAlocado += $valorBrutoRecebido
      }

      $novaLinha = -not $idsExistentes.Contains($idSincronizacao)
      if ($novaLinha) {
        $linhaDestino = $totalRow
        $sourceRow = [Math]::Max(6, $totalRow - 1)
        [void]$vendas.Rows.Item($totalRow).Insert()
        Copy-RowStyle $vendas $sourceRow $totalRow 'B' 'P'
      } else {
        $linhaDestino = [int]$linhasPorId[$idSincronizacao]
      }

      Set-RowDate $vendas $linhaDestino 2 (Get-Date -Year $dataLocacao.Year -Month $dataLocacao.Month -Day 1)
      Set-RowDate $vendas $linhaDestino 3 $dataLocacao
      Write-TextCell $vendas $linhaDestino 4 $(if ($locacao.clinica.razaoSocial) { $locacao.clinica.razaoSocial } else { $locacao.clinica.nomeFantasia })
      # A planilha Vendas registra somente a cidade; a UF fica fora deste campo.
      Write-TextCell $vendas $linhaDestino 5 (([string]$locacao.cidadeLocacao) -replace '\s*-\s*[A-Za-z]{2}\s*$', '')
      Write-TextCell $vendas $linhaDestino 6 $maquina
      Write-FormulaCell $vendas $linhaDestino 7 "=$(FormulaNumber $linha)"
      Write-FormulaCell $vendas $linhaDestino 8 "=$(FormulaNumber $canetaOuAgulha)"
      Write-FormulaCell $vendas $linhaDestino 9 '=1'
      Write-FormulaCell $vendas $linhaDestino 10 "=$(FormulaNumber $item.valorDiaria)"
      if ($null -ne $valorBrutoRecebido) {
        Write-FormulaCell $vendas $linhaDestino 11 "=$(FormulaNumber $valorBrutoRecebido)"
      } elseif ($isSylfirm) {
        Write-FormulaCell $vendas $linhaDestino 11 "=J$linhaDestino"
      } elseif ($isLiftera) {
        Write-FormulaCell $vendas $linhaDestino 11 "=(G$linhaDestino*Premissas!`$C`$10)+(H$linhaDestino*Premissas!`$C`$11)+`$J$linhaDestino"
      } else {
        Write-FormulaCell $vendas $linhaDestino 11 "=J$linhaDestino"
      }
      if ($isSylfirm) {
        Write-FormulaCell $vendas $linhaDestino 12 "=H$linhaDestino*Premissas!`$C`$9"
      } elseif ($isLiftera) {
        Write-FormulaCell $vendas $linhaDestino 12 "=(H$linhaDestino*$(FormulaNumber $custoCanetaLiftera))+(G$linhaDestino*$(FormulaNumber $custoLinhaLiftera))"
      } else {
        Write-FormulaCell $vendas $linhaDestino 12 '=0'
      }
      Write-FormulaCell $vendas $linhaDestino 13 "=K$linhaDestino-L$linhaDestino"
      Write-TextCell $vendas $linhaDestino 14 $recebedores
      Write-TextCell $vendas $linhaDestino 15 ''
      Write-TextCell $vendas $linhaDestino 16 $idSincronizacao
      $vendas.Cells.Item($linhaDestino, 2).NumberFormat = 'mmm/aaaa'
      $vendas.Cells.Item($linhaDestino, 3).NumberFormat = 'dd/mm/aaaa'
      $vendas.Range("J$linhaDestino:M$linhaDestino").NumberFormat = 'R$ #,##0.00'

      if ($novaLinha) {
        [void]$idsExistentes.Add($idSincronizacao)
        $linhasPorId[$idSincronizacao] = $linhaDestino
        $incluidas++
        $totalRow++
      }
      $indiceItem++
    }
  }

  $lastDataRow = $totalRow - 1
  for ($row = 6; $row -le $lastDataRow; $row++) {
    if ([string]::IsNullOrWhiteSpace(([string]$vendas.Cells.Item($row, 5).Value2)) ) {
      Write-TextCell $vendas $row 5 'Não informado'
    }
    if ([string]::IsNullOrWhiteSpace(([string]$vendas.Cells.Item($row, 14).Value2)) ) {
      Write-TextCell $vendas $row 14 'Não informado'
    }
  }
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
    Write-FormulaCell $resumo $row 6 "=SUMIFS(Vendas!`$K`$6:`$K`$$lastDataRow,Vendas!`$B`$6:`$B`$$lastDataRow,`$B$row)"
    Write-FormulaCell $resumo $row 7 "=SUMIFS(Vendas!`$L`$6:`$L`$$lastDataRow,Vendas!`$B`$6:`$B`$$lastDataRow,`$B$row)"
    Write-FormulaCell $resumo $row 8 "=SUMIFS(Vendas!`$M`$6:`$M`$$lastDataRow,Vendas!`$B`$6:`$B`$$lastDataRow,`$B$row)"
    Write-FormulaCell $resumo $row 9 $(if ($row -eq 6) { '' } else { "=H$row/H$($row - 1)-1" })
    Write-FormulaCell $resumo $row 10 "=H$row/`$H`$$summaryTotalRow"
    Write-FormulaCell $resumo $row 12 "=TEXT(B$row,`"mmm/aa`")"
  }
  foreach ($column in 3..10) {
    $letter = [char](64 + $column)
    Write-FormulaCell $resumo $summaryTotalRow $column "=SUM(${letter}6:${letter}${lastSummaryRow})"
  }
  Write-TextCell $resumo $summaryTotalRow 2 'TOTAL'
  # Dados auxiliares do grafico Linha x Caneta: somente aparelhos Liftera.
  Write-TextCell $resumo 6 14 'Linha Liftera'
  Write-TextCell $resumo 7 14 'Caneta Liftera'
  Write-TextCell $resumo 8 14 ''
  Write-FormulaCell $resumo 6 15 "=SUMIF(Vendas!`$F`$6:`$F`$$lastDataRow,`"*Liftera*`",Vendas!`$G`$6:`$G`$$lastDataRow)"
  Write-FormulaCell $resumo 7 15 "=SUMIF(Vendas!`$F`$6:`$F`$$lastDataRow,`"*Liftera*`",Vendas!`$H`$6:`$H`$$lastDataRow)"
  Write-TextCell $resumo 8 15 ''
  $resumo.Columns.Item(6).ColumnWidth = 16
  $resumo.Columns.Item(7).ColumnWidth = 16
  $resumo.Columns.Item(8).ColumnWidth = 16

  # O painel ja possui formulas que se atualizam a partir da aba Vendas. Recriar
  # toda a estrutura dele durante cada envio pode derrubar o processo do Excel
  # em algumas instalacoes. Essa manutencao pesada fica disponivel somente sob
  # demanda com -RefreshDashboard; a sincronizacao normal prioriza gravar a
  # locacao com seguranca.
  if ($RefreshDashboard) {
  # Dashboard completo: todos os aparelhos, com contagens e rankings atualizados.
  Write-FormulaCell $dashboard 10 2 "='Resumo Mensal'!`$H`$$summaryTotalRow"
  Write-FormulaCell $dashboard 10 7 '=ROUND(SUMPRODUCT((Vendas!$E$6:$E$5000<>"")/COUNTIF(Vendas!$E$6:$E$5000,Vendas!$E$6:$E$5000&"")),0)-IF(COUNTIF(Vendas!$E$6:$E$5000,"Não informado")>0,1,0)'
  Write-FormulaCell $dashboard 11 7 '=ROUND(SUMPRODUCT((Vendas!$D$6:$D$5000<>"")/COUNTIF(Vendas!$D$6:$D$5000,Vendas!$D$6:$D$5000&"")),0)&" clientes ativos em "&ROUND(G10,0)&" cidades"'
  Write-FormulaCell $dashboard 10 12 "='Resumo Mensal'!G$summaryTotalRow/'Resumo Mensal'!E$summaryTotalRow"
  Write-FormulaCell $dashboard 10 17 "=PROPER(TEXT(INDEX('Resumo Mensal'!`$B`$6:`$B`$$lastSummaryRow,MATCH(MAX('Resumo Mensal'!`$H`$6:`$H`$$lastSummaryRow),'Resumo Mensal'!`$H`$6:`$H`$$lastSummaryRow,0)),`"mmmm`"))"
  Write-FormulaCell $dashboard 11 17 "=TEXT(MAX('Resumo Mensal'!`$H`$6:`$H`$$lastSummaryRow),`"R$ #.##0,00`")"
  Write-FormulaCell $dashboard 15 2 "=SUMIF(Vendas!`$F`$6:`$F`$$lastDataRow,`"*Liftera*`",Vendas!`$H`$6:`$H`$$lastDataRow)"
  Write-FormulaCell $dashboard 15 7 "=SUMIF(Vendas!`$F`$6:`$F`$$lastDataRow,`"*Liftera*`",Vendas!`$G`$6:`$G`$$lastDataRow)"
  Write-FormulaCell $dashboard 15 12 "=COUNT(Vendas!`$C`$6:`$C`$$lastDataRow)"
  $monthCount = [Math]::Max(1, $lastSummaryRow - 5)
  Write-FormulaCell $dashboard 15 17 "='Resumo Mensal'!`$H`$$summaryTotalRow/$monthCount"
  Write-FormulaCell $vendas 3 2 '=COUNT(C6:C5000)&" Locações - "&ROUND(SUMPRODUCT((D6:D5000<>"")/COUNTIF(D6:D5000,D6:D5000&"")),0)&" clientes - "&(ROUND(SUMPRODUCT((E6:E5000<>"")/COUNTIF(E6:E5000,E6:E5000&"")),0)-IF(COUNTIF(E6:E5000,"Não informado")>0,1,0))&" cidades - base histórica consolidada"'

  # Rankings completos e totalmente formula-driven. As formulas derramam todas
  # as linhas unicas e se reorganizam automaticamente quando Vendas muda.
  $listObjects = $dashboard.ListObjects
  try {
    while ($listObjects.Count -gt 0) {
      $listObject = $listObjects.Item(1)
      try { [void]$listObject.Unlist() } finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($listObject) }
    }
  } finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($listObjects) }

  foreach ($anchor in @('B37', 'G37', 'L37')) {
    $anchorCell = $dashboard.Range($anchor)
    try { $anchorCell.ClearContents() } catch {}
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($anchorCell)
  }
  $rankingArea = $dashboard.Range('B35:T5000')
  try {
    $rankingArea.UnMerge()
    $rankingArea.ClearContents()
  } finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($rankingArea) }
  $rankingBody = $dashboard.Range('B37:O500')
  try {
    $rankingBody.FormatConditions.Delete()
    $rankingBody.ClearFormats()
  } finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($rankingBody) }

  foreach ($address in @('B35:E35', 'G35:J35', 'L35:O35')) {
    $titleRange = $dashboard.Range($address)
    [void]$titleRange.Merge()
    $titleRange.HorizontalAlignment = -4108
    $titleRange.VerticalAlignment = -4108
    $titleRange.Font.Bold = $true
    $titleRange.Font.Name = 'Aptos'
    $titleRange.Font.Size = 10
    $titleRange.Font.Color = 16777215
    $titleRange.Interior.Color = 5123343
    $titleRange.WrapText = $true
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($titleRange)
  }
  $dashboard.Rows.Item(35).RowHeight = 30
  $machinesLabel = 'M' + [char]0x00C1 + 'QUINAS'
  $rentalsLabel = 'Loca' + [char]0x00E7 + [char]0x00F5 + 'es'
  $netLabel = 'Resultado l' + [char]0x00ED + 'quido'
  Write-TextCell $dashboard 35 2 "RANKING DE CLIENTES - TODAS AS $machinesLabel"
  Write-TextCell $dashboard 35 7 'RECEBIMENTOS POR DESTINO'
  Write-TextCell $dashboard 35 12 "RANKING DE CIDADES - TODAS AS $machinesLabel"

  $headers = @(
    @(2, 'Cliente'), @(3, 'Cidade'), @(4, $rentalsLabel), @(5, $netLabel),
    @(7, 'Recebedor'), @(8, $rentalsLabel), @(9, 'Valor recebido'), @(10, '% do total'),
    @(12, 'Cidade'), @(13, $rentalsLabel), @(14, $netLabel), @(15, '% do total')
  )
  foreach ($header in $headers) { Write-TextCell $dashboard 36 ([int]$header[0]) $header[1] }
  foreach ($address in @('B36:E36', 'G36:J36', 'L36:O36')) {
    $headerRange = $dashboard.Range($address)
    $headerRange.Font.Bold = $true
    $headerRange.Font.Name = 'Aptos'
    $headerRange.Font.Size = 9
    $headerRange.Font.Color = 16777215
    $headerRange.Interior.Color = 7949855
    $headerRange.HorizontalAlignment = -4108
    $headerRange.VerticalAlignment = -4108
    $headerRange.WrapText = $true
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($headerRange)
  }
  $dashboard.Rows.Item(36).RowHeight = 32

  $clientFormula = '=LET(last,MATCH("TOTAL*",Vendas!$B:$B,0)-1,n,Vendas!$D$6:INDEX(Vendas!$D:$D,last),c,Vendas!$E$6:INDEX(Vendas!$E:$E,last),v,Vendas!$M$6:INDEX(Vendas!$M:$M,last),u,UNIQUE(FILTER(n,n<>"")),q,COUNTIF(n,u),t,SUMIF(n,u,v),SORTBY(CHOOSE({1,2,3,4},u,XLOOKUP(u,n,c,""),q,t),t,-1,q,-1,u,1))'
  $receiverFormula = '=LET(last,MATCH("TOTAL*",Vendas!$B:$B,0)-1,r,Vendas!$N$6:INDEX(Vendas!$N:$N,last),v,Vendas!$K$6:INDEX(Vendas!$K:$K,last),u,UNIQUE(FILTER(r,r<>"")),q,COUNTIF(r,u),t,SUMIF(r,u,v),SORTBY(CHOOSE({1,2,3,4},u,q,t,t/SUM(v)),t,-1,q,-1,u,1))'
  $cityFormula = '=LET(last,MATCH("TOTAL*",Vendas!$B:$B,0)-1,c,Vendas!$E$6:INDEX(Vendas!$E:$E,last),v,Vendas!$M$6:INDEX(Vendas!$M:$M,last),u,UNIQUE(FILTER(c,c<>"")),q,COUNTIF(c,u),t,SUMIF(c,u,v),SORTBY(CHOOSE({1,2,3,4},u,q,t,t/SUM(v)),t,-1,q,-1,u,1))'
  Write-Formula2Cell $dashboard 37 2 $clientFormula
  Write-Formula2Cell $dashboard 37 7 $receiverFormula
  Write-Formula2Cell $dashboard 37 12 $cityFormula
  $excel.CalculateFull()

  $rankingSpecs = @(
    [pscustomobject]@{ Anchor = 'B37'; FirstColumn = 2; CountColumn = 4; MoneyColumn = 5; PercentColumn = 0 },
    [pscustomobject]@{ Anchor = 'G37'; FirstColumn = 7; CountColumn = 8; MoneyColumn = 9; PercentColumn = 10 },
    [pscustomobject]@{ Anchor = 'L37'; FirstColumn = 12; CountColumn = 13; MoneyColumn = 14; PercentColumn = 15 }
  )
  foreach ($spec in $rankingSpecs) {
    $anchorCell = $dashboard.Range($spec.Anchor)
    $spillRange = $null
    try {
      $spillRange = $anchorCell.SpillingToRange
      $spillRange.Font.Name = 'Aptos'
      $spillRange.Font.Size = 9.5
      $spillRange.Font.Color = 2302755
      $spillRange.VerticalAlignment = -4108
      $spillRange.HorizontalAlignment = -4131
      $spillRange.WrapText = $false
      $spillRange.Borders.LineStyle = 1
      $spillRange.Borders.Color = 15656156
      $spillRange.EntireRow.RowHeight = 21
      for ($rankingRow = 1; $rankingRow -le $spillRange.Rows.Count; $rankingRow++) {
        $rowRange = $spillRange.Rows.Item($rankingRow)
        $rowRange.Interior.Color = $(if ($rankingRow % 2 -eq 0) { 16578805 } else { 16777215 })
        if ($rankingRow -le 3) { $rowRange.Font.Bold = $true }
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($rowRange)
      }
      $lastRankingRow = 36 + $spillRange.Rows.Count
      $countRange = $dashboard.Range("$([char](64 + $spec.CountColumn))37`:$([char](64 + $spec.CountColumn))$lastRankingRow")
      $moneyRange = $dashboard.Range("$([char](64 + $spec.MoneyColumn))37`:$([char](64 + $spec.MoneyColumn))$lastRankingRow")
      $countRange.NumberFormatLocal = '0'
      $moneyRange.NumberFormatLocal = 'R$ #.##0,00'
      $countRange.HorizontalAlignment = -4152
      $moneyRange.HorizontalAlignment = -4152
      [void][Runtime.InteropServices.Marshal]::ReleaseComObject($countRange)
      [void][Runtime.InteropServices.Marshal]::ReleaseComObject($moneyRange)
      if ($spec.PercentColumn -gt 0) {
        $percentRange = $dashboard.Range("$([char](64 + $spec.PercentColumn))37`:$([char](64 + $spec.PercentColumn))$lastRankingRow")
        $percentRange.NumberFormatLocal = '0,0%'
        $percentRange.HorizontalAlignment = -4152
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($percentRange)
      }
    } finally {
      if ($spillRange) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($spillRange) }
      [void][Runtime.InteropServices.Marshal]::ReleaseComObject($anchorCell)
    }
  }

  $dashboard.Columns.Item(2).ColumnWidth = 28
  $dashboard.Columns.Item(3).ColumnWidth = 21
  $dashboard.Columns.Item(4).ColumnWidth = 12
  $dashboard.Columns.Item(5).ColumnWidth = 20
  $dashboard.Columns.Item(6).ColumnWidth = 3
  $dashboard.Columns.Item(7).ColumnWidth = 22
  $dashboard.Columns.Item(8).ColumnWidth = 12
  $dashboard.Columns.Item(9).ColumnWidth = 20
  $dashboard.Columns.Item(10).ColumnWidth = 12
  $dashboard.Columns.Item(11).ColumnWidth = 3
  $dashboard.Columns.Item(12).ColumnWidth = 22
  $dashboard.Columns.Item(13).ColumnWidth = 12
  $dashboard.Columns.Item(14).ColumnWidth = 20
  $dashboard.Columns.Item(15).ColumnWidth = 12
  [void]$dashboard.Activate()
  $activeWindow = $excel.ActiveWindow
  if ($activeWindow) {
    $activeWindow.DisplayGridlines = $false
    $activeWindow.Zoom = 85
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($activeWindow)
  }

  # Mantem os dois graficos alinhados com os dados atualizados.
  $chartObjects = $dashboard.ChartObjects()
  try {
    for ($chartIndex = 1; $chartIndex -le $chartObjects.Count; $chartIndex++) {
      $chartObject = $chartObjects.Item($chartIndex)
      $chart = $chartObject.Chart
      $title = if ($chart.HasTitle) { [string]$chart.ChartTitle.Text } else { '' }
      $series = $chart.SeriesCollection(1)
      try {
        if ($title -match 'LINHA') {
          $categories = $resumo.Range('N6:N7')
          $values = $resumo.Range('O6:O7')
          $series.XValues = $categories
          $series.Values = $values
          $chart.ChartTitle.Text = 'LINHA X CANETA - LIFTERA'
          [void][Runtime.InteropServices.Marshal]::ReleaseComObject($categories)
          [void][Runtime.InteropServices.Marshal]::ReleaseComObject($values)
        } elseif ($title -match 'LOCA') {
          $categories = $resumo.Range("L6:L$lastSummaryRow")
          $values = $resumo.Range("H6:H$lastSummaryRow")
          $series.XValues = $categories
          $series.Values = $values
          [void][Runtime.InteropServices.Marshal]::ReleaseComObject($categories)
          [void][Runtime.InteropServices.Marshal]::ReleaseComObject($values)
        }
      } finally {
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($series)
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($chart)
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($chartObject)
      }
    }
  } finally {
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($chartObjects)
  }

  }

  $workbook.Save()
  $saveWorkbook = $true
  Write-Output "Sincronizacao concluida: $incluidas nova(s) linha(s) incluida(s) na aba Vendas."
} finally {
  if ($workbook) {
    try { $workbook.Close($saveWorkbook) } catch {
      Write-Verbose "O Excel ja havia encerrado a planilha durante a limpeza."
    }
  }
  if ($excel) {
    try { $excel.Quit() } catch {
      Write-Verbose "O Excel ja havia encerrado durante a limpeza."
    }
  }
  Release-ComObjectSafely $dashboard
  Release-ComObjectSafely $resumo
  Release-ComObjectSafely $premissas
  Release-ComObjectSafely $vendas
  Release-ComObjectSafely $workbook
  Release-ComObjectSafely $excel
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  $syncMutex.ReleaseMutex()
  $syncMutex.Dispose()
}
