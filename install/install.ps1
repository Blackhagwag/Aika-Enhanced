<#
  Aika Enhanced — installer for Windows 10/11 (Millennium for Steam).

    powershell -ExecutionPolicy Bypass -File install\install.ps1
    ... -ThemesDir "D:\Steam\millennium\themes"   use this themes folder (the one Millennium's
                                                   "open themes folder" button opens)
    ... -Restart                                   also restart Steam afterwards (asks first)
    ... -DryRun                                    only show what would happen

  What it does: copies the theme into <themes>\Aika-Enhanced. An existing
  Aika-Enhanced folder is moved to <themes>\..\aika-enhanced-backups\<time>\
  first. Nothing else is touched: no other theme, plugin, Millennium config,
  registry value or Steam file is changed, no admin rights are requested,
  Steam is never closed without asking. Activate the theme in
  Steam -> Millennium -> Themes.
#>
param(
  [string]$ThemesDir = "",
  [switch]$Restart,
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"
$Name = "Aika-Enhanced"
$Src = Split-Path -Parent $PSScriptRoot
function Say($m) { Write-Host "> $m" -ForegroundColor Magenta }
if (-not (Test-Path (Join-Path $Src "skin.json"))) { throw "skin.json not found next to the installer ($Src)" }

# --- Steam ----------------------------------------------------------------------
$Steam = $null
foreach ($k in @(
  @{ Path = "HKCU:\Software\Valve\Steam"; Value = "SteamPath" },
  @{ Path = "HKLM:\SOFTWARE\WOW6432Node\Valve\Steam"; Value = "InstallPath" },
  @{ Path = "HKLM:\SOFTWARE\Valve\Steam"; Value = "InstallPath" })) {
  try { $v = (Get-ItemProperty -Path $k.Path -Name $k.Value -ErrorAction Stop).($k.Value) } catch { $v = $null }
  if ($v -and (Test-Path (Join-Path $v "steamui"))) { $Steam = (Resolve-Path $v).Path; break }
}
if (-not $Steam) {
  $fallback = Join-Path ${env:ProgramFiles(x86)} "Steam"
  if (Test-Path (Join-Path $fallback "steamui")) { $Steam = $fallback }
}
if ($Steam) { Say "Steam: $Steam" } else { Say "Steam not found (use -ThemesDir)." }

# --- Millennium's themes folder ----------------------------------------------------
if (-not $ThemesDir) {
  $candidates = @()
  if ($Steam) { $candidates += (Join-Path $Steam "millennium\themes"), (Join-Path $Steam "steamui\skins") }
  foreach ($c in $candidates) { if (Test-Path $c -PathType Container) { $ThemesDir = $c; break } }
}
if (-not $ThemesDir -or -not (Test-Path $ThemesDir -PathType Container)) {
  Write-Host "Millennium's themes folder was not found. Is Millennium installed (https://steambrew.app)?"
  Write-Host "Open Steam -> Millennium -> Themes, press the folder button, and run again with -ThemesDir `"<that folder>`"."
  exit 1
}
$ThemesDir = (Resolve-Path $ThemesDir).Path
Say "Themes folder: $ThemesDir"
$others = @(Get-ChildItem $ThemesDir -Directory | Where-Object { $_.Name -ne $Name }).Count
Say "Other themes there: $others (left as they are)"

# --- Backup, copy ------------------------------------------------------------------
$Dest = Join-Path $ThemesDir $Name
if (Test-Path $Dest) {
  $Bk = Join-Path (Split-Path -Parent $ThemesDir) ("aika-enhanced-backups\" + (Get-Date -Format "yyyyMMdd-HHmmss"))
  Say "Backing up the installed $Name to $Bk"
  if (-not $DryRun) { New-Item -ItemType Directory -Force -Path $Bk | Out-Null; Move-Item $Dest $Bk }
}
Say "Installing to $Dest"
$skip = @(".git", "tests", "tools", "install", "node_modules", ".github")
if (-not $DryRun) {
  New-Item -ItemType Directory -Force -Path $Dest | Out-Null
  Get-ChildItem $Src -Force | Where-Object { $skip -notcontains $_.Name } |
    ForEach-Object { Copy-Item $_.FullName -Destination $Dest -Recurse -Force }
  try { $skinData = Get-Content (Join-Path $Dest "skin.json") -Raw | ConvertFrom-Json; Say "skin.json is valid" }
  catch { Say "Check $Dest\skin.json: $_"; $skinData = $null }
  # metadata.json is how Millennium -> Updates knows which commit is installed (it compares it
  # with the newest commit of the repository's default branch). Millennium writes it itself when
  # it installs or updates a theme; a manual install writes it here so updates are offered.
  # An unknown commit makes Millennium offer the newest version once, which resyncs it.
  if ($skinData -and $skinData.github) {
    $commit = "unknown"
    try { $c = (& git -C $Src rev-parse HEAD 2>$null); if ($LASTEXITCODE -eq 0 -and $c) { $commit = "$c".Trim() } } catch {}
    $meta = [ordered]@{ commit = $commit; owner = $skinData.github.owner; repo = $skinData.github.repo_name }
    [IO.File]::WriteAllText((Join-Path $Dest "metadata.json"), ($meta | ConvertTo-Json), (New-Object System.Text.UTF8Encoding $false))
    Say "metadata.json: $($meta.owner)/$($meta.repo) @ $commit"
  }
}

# --- Steam restart (optional, asks first) ---------------------------------------------
if ($Restart -and (Get-Process steam -ErrorAction SilentlyContinue)) {
  $ok = Read-Host "Steam is running and will be CLOSED and started again. Continue? [y/N]"
  if ($ok -eq "y" -and -not $DryRun) {
    $exe = Join-Path $Steam "steam.exe"
    Start-Process $exe -ArgumentList "-shutdown"
    for ($i = 0; $i -lt 30 -and (Get-Process steam -ErrorAction SilentlyContinue); $i++) { Start-Sleep 1 }
    Start-Process $exe
  } else { Say "Steam left running. Restart it yourself to load the theme." }
}

Write-Host ""
Write-Host "Done. In Steam: Steam menu -> Millennium -> Themes -> choose 'Aika Enhanced'"
Write-Host "(enable theme scripts if asked). The Friends Dock settings are on its 'Friends Dock' tab."
