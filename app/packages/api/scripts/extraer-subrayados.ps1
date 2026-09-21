$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$docNew = "C:\Users\Fortin69\Documents\Proyectos.Hermes\CookPlan\Recetas.Mar.New.docx"
$docUlt = "C:\Users\Fortin69\Documents\Proyectos.Hermes\CookPlan\Recetas.Mar.Ultimo.13.02.24.docx"

function Parsear-Impresionantes([string]$ruta, [string]$etiqueta) {
  $zip = [System.IO.Compression.ZipFile]::OpenRead($ruta)
  try {
    $entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' } | Select-Object -First 1
    $sr = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)
    $xml = $sr.ReadToEnd()
    $sr.Dispose()

    # Separar por parrafos y quitar la etiqueta <w:p ...> de apertura
    $parrafos = [regex]::Split($xml, '</w:p>')
    $n = 0
    foreach ($p in $parrafos) {
      if ($p -notmatch '<w:u') { continue }
      # texto de todos los <w:t> del parrafo
      $texto = ''
      foreach ($m in [regex]::Matches($p, '<w:t[^>]*>([^<]*)</w:t>')) {
        $texto += $m.Groups[1].Value
      }
      $texto = $texto -replace '\s+', ' '
      $texto = $texto.Trim()
      if (-not $texto) { continue }
      if ($texto.Length -gt 50) { continue }
      if ([regex]::IsMatch($texto, '^[-•*·]')) { continue }
      if ([regex]::IsMatch($texto, '^\d') -and $texto.Length -lt 4) { continue }
      $n++
      Write-Output ("{0}|{1}" -f $etiqueta, $texto)
    }
    Write-Output ("{0}_TOTAL={1}" -f $etiqueta, $n)
  } finally {
    $zip.Dispose()
  }
}

Parsear-Impresionantes $docNew "NEW"
Parsear-Impresionantes $docUlt "ULT"
