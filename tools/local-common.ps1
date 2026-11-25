# Shared helpers for tools\backup-local.ps1 and tools\restore-local.ps1 (dot-sourced).

function Find-SteamPath {
  foreach ($k in @(
      @{ Path = "HKCU:\Software\Valve\Steam"; Value = "SteamPath" },
      @{ Path = "HKLM:\SOFTWARE\WOW6432Node\Valve\Steam"; Value = "InstallPath" })) {
    try { $v = (Get-ItemProperty -Path $k.Path -Name $k.Value -ErrorAction Stop).($k.Value) } catch { $v = $null }
    if ($v -and (Test-Path (Join-Path $v "millennium"))) { return (Resolve-Path $v).Path }
  }
  $fallback = Join-Path ${env:ProgramFiles(x86)} "Steam"
  if (Test-Path (Join-Path $fallback "millennium")) { return $fallback }
  throw "Steam with Millennium was not found."
}

# The installed Aika Enhanced: the theme folder whose skin.json is named "Aika Enhanced"
# (any folder name - Millennium keys the settings by that folder name).
function Find-AikaInstall([string]$ThemeDir = "") {
  $steam = Find-SteamPath
  $mill = Join-Path $steam "millennium"
  $themes = Join-Path $mill "themes"
  if ($ThemeDir) { $dirs = @(Get-Item $ThemeDir) }
  else {
    $dirs = @(Get-ChildItem $themes -Directory | Where-Object {
        $s = Join-Path $_.FullName "skin.json"
        (Test-Path $s) -and ((Get-Content $s -Raw | ConvertFrom-Json).name -eq "Aika Enhanced")
      })
  }
  if ($dirs.Count -eq 0) { throw "Aika Enhanced is not installed in $themes" }
  if ($dirs.Count -gt 1) {
    $cfg = Get-Content (Join-Path $mill "config\config.json") -Raw | ConvertFrom-Json
    $active = $dirs | Where-Object { $_.Name -eq $cfg.themes.activeTheme }
    if ($active) { $dirs = @($active) } else { throw "Several Aika Enhanced folders: $($dirs.Name -join ', '). Pass -ThemeDir." }
  }
  $d = $dirs[0]
  $skin = Get-Content (Join-Path $d.FullName "skin.json") -Raw | ConvertFrom-Json
  [pscustomobject]@{ Steam = $steam; Millennium = $mill; Path = $d.FullName; Native = $d.Name; Version = $skin.version }
}
