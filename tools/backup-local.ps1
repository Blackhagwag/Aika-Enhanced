<#
  Aika Enhanced - back up the INSTALLED theme and its Millennium settings (local only).

    powershell -ExecutionPolicy Bypass -File tools\backup-local.ps1 [-Label before-2.0.1]

  Writes <Steam>\millennium\aika-enhanced-backups\<time>[-label]\ with:
    theme\                    a full copy of the installed theme folder (metadata.json included)
    settings.json             this theme's entries from Millennium's config.json:
                              conditions (every setting), themeColors, and whether it is active
    millennium-config.json    a full copy of Millennium's config.json
  Nothing is uploaded anywhere; the backups folder is outside any git repository.
  Restore with tools\restore-local.ps1.
#>
param([string]$Label = "", [string]$ThemeDir = "")
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "local-common.ps1")

$t = Find-AikaInstall -ThemeDir $ThemeDir
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
if ($Label) { $stamp = "$stamp-$($Label -replace '[^\w.-]', '_')" }
$bk = Join-Path $t.Millennium "aika-enhanced-backups\$stamp"
New-Item -ItemType Directory -Force -Path $bk | Out-Null

Copy-Item $t.Path -Destination (Join-Path $bk "theme") -Recurse -Force
$cfgPath = Join-Path $t.Millennium "config\config.json"
if (Test-Path $cfgPath) {
  Copy-Item $cfgPath (Join-Path $bk "millennium-config.json")
  $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
  $settings = [ordered]@{
    native      = $t.Native
    version     = $t.Version
    active      = ($cfg.themes.activeTheme -eq $t.Native)
    conditions  = $cfg.themes.conditions.($t.Native)
    themeColors = $cfg.themes.themeColors.($t.Native)
  }
  [IO.File]::WriteAllText((Join-Path $bk "settings.json"), ($settings | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding $false))
}
Write-Host "> Backed up '$($t.Native)' ($($t.Version)) to $bk" -ForegroundColor Magenta
$bk
