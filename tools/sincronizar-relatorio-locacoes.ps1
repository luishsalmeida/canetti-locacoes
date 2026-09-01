param(
  [string]$ApiUrl = $(if ($env:CANETTI_API_URL) { $env:CANETTI_API_URL } else { 'https://canetti-locacoes.onrender.com/api' }),
  [string]$ReportSyncKey = $env:CANETTI_REPORT_SYNC_KEY
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ReportSyncKey)) {
  $secretPath = Join-Path $env:LOCALAPPDATA 'CanettiLocacoes\report-sync.key'
  if (Test-Path -LiteralPath $secretPath) {
    $secureKey = Get-Content -Raw -LiteralPath $secretPath | ConvertTo-SecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    try {
      $ReportSyncKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  }
}

if ([string]::IsNullOrWhiteSpace($ReportSyncKey)) {
  throw 'A chave da sincronizacao nao foi configurada. Execute primeiro instalar-sincronizacao-relatorio-locacoes.ps1.'
}

$desktop = [Environment]::GetFolderPath('Desktop')
$arquivo = Get-ChildItem -LiteralPath $desktop -File | Where-Object {
  $_.Extension -eq '.xlsx' -and $_.Name -like 'Relat*' -and $_.Name -like '*2026*'
} | Select-Object -First 1

if (-not $arquivo) {
  throw 'O arquivo de relatorio de locacoes 2026 nao foi encontrado na Area de Trabalho.'
}

$resposta = Invoke-RestMethod -Uri "$($ApiUrl.TrimEnd('/'))/relatorios/locacoes-concluidas" -Headers @{ 'x-report-sync-key' = $ReportSyncKey }
$locacoes = @($resposta.locacoes)

$excel = $null
$workbook = $null
$sheet = $null

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Open($arquivo.FullName, 0, $false)

  try {
    $sheet = $workbook.Worksheets.Item('Locacoes Sistema')
  } catch {
    $sheet = $workbook.Worksheets.Add($workbook.Worksheets.Item($workbook.Worksheets.Count))
    $sheet.Name = 'Locacoes Sistema'
    $headers = @(
      'ID sincronizacao', 'Protocolo', 'Data da locacao', 'Clinica', 'Cidade', 'Aparelhos',
      'Tecnico', 'Motorista', 'Valor dos aparelhos', 'Desconto', 'Valor final',
      'Forma de pagamento', 'Valor recebido', 'Status', 'Observacoes', 'Sincronizado em'
    )
    for ($coluna = 0; $coluna -lt $headers.Count; $coluna++) {
      $sheet.Cells.Item(1, $coluna + 1).Value2 = $headers[$coluna]
    }
    $headerRange = $sheet.Range('A1', 'P1')
    $headerRange.Font.Bold = $true
    $headerRange.Font.Color = 16777215
    $headerRange.Interior.Color = 11382189
    $headerRange.HorizontalAlignment = -4108
    $sheet.Rows.Item(1).AutoFilter() | Out-Null
    $larguras = @(20, 13, 15, 28, 18, 36, 22, 22, 18, 14, 16, 20, 16, 14, 42, 20)
    for ($coluna = 0; $coluna -lt $larguras.Count; $coluna++) {
      $sheet.Columns.Item($coluna + 1).ColumnWidth = $larguras[$coluna]
    }
    $sheet.Application.ActiveWindow.SplitRow = 1
    $sheet.Application.ActiveWindow.FreezePanes = $true
  }

  $ultimaLinha = $sheet.Cells.Item($sheet.Rows.Count, 1).End(-4162).Row
  if ($ultimaLinha -lt 1) { $ultimaLinha = 1 }
  $existentes = New-Object 'System.Collections.Generic.HashSet[string]'
  for ($linha = 2; $linha -le $ultimaLinha; $linha++) {
    $idExistente = [string]$sheet.Cells.Item($linha, 1).Value2
    if ($idExistente) { [void]$existentes.Add($idExistente) }
  }

  $incluidas = 0
  foreach ($locacao in $locacoes) {
    $idSincronizacao = "LOC-$($locacao.id)"
    if ($existentes.Contains($idSincronizacao)) { continue }

    $linha = $ultimaLinha + 1
    $ultimaLinha = $linha
    [void]$existentes.Add($idSincronizacao)
    $aparelhos = @($locacao.itens | ForEach-Object { $_.equipamento.descricao } | Where-Object { $_ }) -join ' | '
    $formasPagamento = @($locacao.pagamentos | ForEach-Object { $_.forma } | Where-Object { $_ } | Select-Object -Unique) -join ' | '
    $valorRecebido = @($locacao.pagamentos | Where-Object { $_.status -eq 'RECEBIDO' } | ForEach-Object { [decimal]$_.valor } | Measure-Object -Sum).Sum
    if ($null -eq $valorRecebido) { $valorRecebido = 0 }
    $dataLocacao = if ($locacao.dataInicio) { ([datetime]$locacao.dataInicio).ToString('dd/MM/yyyy') } else { '' }
    $sincronizadoEm = (Get-Date).ToString('dd/MM/yyyy HH:mm')

    $valores = @(
      $idSincronizacao, $(if ($locacao.codigo) { $locacao.codigo } else { $locacao.id }), $dataLocacao,
      $locacao.clinica.razaoSocial, $locacao.cidadeLocacao, $aparelhos,
      $(if ($locacao.tecnico) { $locacao.tecnico.nome } else { '' }),
      $(if ($locacao.motorista) { $locacao.motorista.nome } else { '' }),
      [decimal]$locacao.valorTotal, [decimal]$locacao.valorDesconto, [decimal]$locacao.valorFinal,
      $formasPagamento, [decimal]$valorRecebido, $locacao.status, $locacao.observacoes, $sincronizadoEm
    )
    for ($coluna = 0; $coluna -lt $valores.Count; $coluna++) {
      $sheet.Cells.Item($linha, $coluna + 1).Value2 = $valores[$coluna]
    }
    $sheet.Range("I$linha", "K$linha").NumberFormat = 'R$ #,##0.00'
    $sheet.Cells.Item($linha, 13).NumberFormat = 'R$ #,##0.00'
    $incluidas++
  }

  $sheet.Range("A1:P$ultimaLinha").VerticalAlignment = -4108
  $sheet.Range("A1:P$ultimaLinha").WrapText = $true
  $workbook.Save()
  Write-Output "Sincronizacao concluida: $incluidas nova(s) locacao(oes) incluida(s)."
} finally {
  if ($workbook) { $workbook.Close($true) }
  if ($excel) { $excel.Quit() }
  if ($sheet) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sheet) }
  if ($workbook) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) }
  if ($excel) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

