<#
  Aika Enhanced - roll the installed theme back to a backup made by tools\backup-local.ps1.

    powershell -ExecutionPolicy Bypass -File tools\restore-local.ps1                 newest backup
    ... -Backup "<Steam>\millennium\aika-enhanced-backups\20261125-130000-before-2.0.1"
    ... -Settings    also put back this theme's settings (conditions, colours) in
                     Millennium's config.json - only while Steam is CLOSED, because
                     Millennium rewrites config.json while it runs

  The current theme folder is first saved as another backup ("pre-restore"), so a
  restore can itself be undone.
#>
param([string]$Backup = "", [switch]$Settings)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "local-common.ps1")

$t = Find-AikaInstall
$root = Join-Path $t.Millennium "aika-enhanced-backups"
if (-not $Backup) {
  $Backup = (Get-ChildItem $root -Directory | Where-Object { Test-Path (Join-Path $_.FullName "theme\skin.json") } |
      Sort-Object Name -Descending | Select-Object -First 1).FullName
  if (-not $Backup) { throw "No backup with a theme\ folder in $root" }
}
$src = Join-Path $Backup "theme"
if (-not (Test-Path (Join-Path $src "skin.json"))) { throw "$Backup has no theme\skin.json" }
$bkVersion = (Get-Content (Join-Path $src "skin.json") -Raw | ConvertFrom-Json).version

if ($Settings -and (Get-Process steam -ErrorAction SilentlyContinue)) {
  throw "Close Steam first: settings can only be restored while Steam is not running."
}

& (Join-Path $PSScriptRoot "backup-local.ps1") -Label "pre-restore" | Out-Null
Write-Host "> Restoring '$($t.Native)' $($t.Version) -> $bkVersion from $Backup" -ForegroundColor Magenta
Remove-Item $t.Path -Recurse -Force
Copy-Item $src -Destination $t.Path -Recurse -Force

if ($Settings) {
  $sPath = Join-Path $Backup "settings.json"
  if (-not (Test-Path $sPath)) { throw "$Backup has no settings.json" }
  $s = Get-Content $sPath -Raw | ConvertFrom-Json
  $cfgPath = Join-Path $t.Millennium "config\config.json"
  $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
  foreach ($part in @("conditions", "themeColors")) {
    if ($null -ne $s.$part) {
      if ($cfg.themes.$part.PSObject.Properties[$t.Native]) { $cfg.themes.$part.($t.Native) = $s.$part }
      else { $cfg.themes.$part | Add-Member -NotePropertyName $t.Native -NotePropertyValue $s.$part }
    }
  }
  [IO.File]::WriteAllText($cfgPath, ($cfg | ConvertTo-Json -Depth 20), (New-Object System.Text.UTF8Encoding $false))
  Write-Host "> Settings of '$($t.Native)' restored in config.json" -ForegroundColor Magenta
}
Write-Host "Done. Restart Steam (or reload the theme in Millennium) to load $bkVersion."
