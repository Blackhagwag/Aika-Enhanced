<#
  Aika Enhanced - cut a stable release.  RUN ONLY AFTER THE OWNER HAS CONFIRMED THE RELEASE.

    powershell -ExecutionPolicy Bypass -File tools\release.ps1 -Version 2.0.1 -Title "Update fixes"
    ... -Push        also push main, dev and the tag (without it nothing leaves this computer)

  What it does, in order (stops at the first problem, nothing is half-done on GitHub):
    1. checks: clean working tree, on branch "dev", main is an ancestor of dev,
       the new version is MAJOR.MINOR.PATCH and higher than main's;
    2. CHANGELOG.md: renames "## Unreleased" to "## <version> - <date> - <title>"
       (the section must list what is new / fixed);
    3. writes the version into skin.json and README.md;
    4. runs tools/validate.mjs (structure, JSON, JS syntax, version sync, settings compatibility);
    5. commits "Aika Enhanced <version> - <title>" on dev - Millennium shows this message
       in Updates -, fast-forwards main to it, tags it v<version> (annotated);
    6. with -Push: pushes main, dev and the tag in one atomic push. GitHub Actions then
       publishes the GitHub Release; Millennium offers the update as soon as main moves.
#>
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [Parameter(Mandatory = $true)][string]$Title,
  [switch]$Push,
  [string]$Remote = "origin"
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$D = [char]0x2014
$Utf8 = New-Object System.Text.UTF8Encoding $false
function Say($m) { Write-Host "> $m" -ForegroundColor Magenta }
function Fail($m) { Write-Host "x $m" -ForegroundColor Red; exit 1 }
function Git { $out = & git @args 2>&1; if ($LASTEXITCODE -ne 0) { Fail "git $($args -join ' '): $out" }; return $out }

# --- 1. Preconditions -----------------------------------------------------------------
if ($Version -notmatch '^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$') { Fail "Version must be MAJOR.MINOR.PATCH, got '$Version'" }
if ($Title -match '[\r\n]') { Fail "Title must be one line" }
if ((Git status --porcelain) -ne $null) { Fail "Working tree is not clean. Commit or stash first." }
$branch = (Git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne "dev") { Fail "Run from branch 'dev' (now on '$branch')." }
& git merge-base --is-ancestor main dev
if ($LASTEXITCODE -ne 0) { Fail "main is not an ancestor of dev $D main was changed outside a release. Sort that out first." }
if ((& git tag -l "v$Version") -ne $null) { Fail "Tag v$Version already exists." }

$prevMain = (Git rev-parse main).Trim()
$mainSkin = (Git show main:skin.json) -join "`n" | ConvertFrom-Json
$cur = [version]$mainSkin.version; $new = [version]$Version
if ($new -le $cur) { Fail "New version $Version must be higher than main's $($mainSkin.version)." }
Say "Release $($mainSkin.version) -> $Version : $Title"

# --- 2. CHANGELOG ---------------------------------------------------------------------
$clPath = Join-Path $Root "CHANGELOG.md"
$cl = [IO.File]::ReadAllText($clPath)
$date = Get-Date -Format "yyyy-MM-dd"
$heading = "## $Version $D $date $D $Title"
if ($cl -match "(?m)^## $([regex]::Escape($Version))\b") {
  Say "CHANGELOG already has a $Version section $D kept as written"
} elseif ($cl -match "(?m)^## Unreleased\s*$") {
  $m = [regex]::Match($cl, "(?ms)^## Unreleased\s*$(.*?)(?=^## |\z)")
  if ($m.Groups[1].Value.Trim().Length -lt 10) { Fail "The '## Unreleased' section of CHANGELOG.md is empty $D list what is new and fixed first." }
  $cl = [regex]::Replace($cl, "(?m)^## Unreleased[ \t]*\r?$", $heading, 1)
  [IO.File]::WriteAllText($clPath, $cl, $Utf8)
  Say "CHANGELOG: '## Unreleased' -> '$heading'"
} else { Fail "CHANGELOG.md needs a '## Unreleased' section listing the changes." }

# --- 3. Version in every file that carries it -------------------------------------------
$skinPath = Join-Path $Root "skin.json"
$skin = [IO.File]::ReadAllText($skinPath)
$skin2 = [regex]::Replace($skin, '("version"\s*:\s*")[^"]*(")', "`${1}$Version`${2}", 1)
[IO.File]::WriteAllText($skinPath, $skin2, $Utf8)
$readmePath = Join-Path $Root "README.md"
$readme = [IO.File]::ReadAllText($readmePath)
$readme2 = $readme.Replace("$([char]0x00B7) $($mainSkin.version)", "$([char]0x00B7) $Version")
[IO.File]::WriteAllText($readmePath, $readme2, $Utf8)
Say "skin.json and README.md -> $Version"

# --- 4. Checks ------------------------------------------------------------------------
& node tools/validate.mjs --tag "v$Version"
if ($LASTEXITCODE -ne 0) { Write-Host "Checks failed. The edits are left in the working tree; 'git checkout -- .' undoes them." -ForegroundColor Red; exit 1 }

# --- 5. Commit, main, tag ---------------------------------------------------------------
$msg = "Aika Enhanced $Version $D $Title"
Git add -A | Out-Null
Git commit -q -m $msg | Out-Null
Git checkout -q main | Out-Null
Git merge -q --ff-only dev | Out-Null
Git tag -a "v$Version" -m $msg | Out-Null
Git checkout -q dev | Out-Null
Say "Committed, main fast-forwarded, tagged v$Version ($((Git rev-parse --short HEAD).Trim()))"

# --- 6. Push ------------------------------------------------------------------------------
if ($Push) {
  Git push --atomic $Remote main dev "v$Version" | Out-Null
  Say "Pushed. GitHub Actions builds the Release; Millennium -> Updates offers $Version now."
} else {
  Say "Not pushed. To publish:"
  Write-Host "    git push --atomic $Remote main dev v$Version"
  Say "To undo locally instead:"
  Write-Host "    git tag -d v$Version; git branch -f main $prevMain; git reset --hard HEAD~1"
}
