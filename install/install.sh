#!/usr/bin/env bash
# Aika Enhanced — installer for Linux (Millennium for Steam).
#
#   ./install/install.sh                  find Steam and Millennium's themes folder, install
#   ./install/install.sh --themes-dir DIR use this themes folder (the one Millennium's
#                                         "open themes folder" button opens)
#   ./install/install.sh --restart        also restart Steam afterwards (asks first)
#   ./install/install.sh --dry-run        only show what would happen
#
# What it does: copies the theme into <themes>/Aika-Enhanced. An existing
# Aika-Enhanced folder is moved to <themes>/../aika-enhanced-backups/<time>/
# first. Nothing else is touched: no other theme, plugin, Millennium config or
# Steam file is changed, nothing runs as root, Steam is never closed without
# asking. Activate the theme in Steam → Millennium → Themes.
set -euo pipefail

NAME="Aika-Enhanced"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THEMES=""; RESTART=0; DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --themes-dir) THEMES="${2:?--themes-dir needs a folder}"; shift 2 ;;
    --restart) RESTART=1; shift ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

say() { printf '\033[1;35m›\033[0m %s\n' "$*"; }
run() { if [ "$DRY" = 1 ]; then echo "  (dry run) $*"; else "$@"; fi; }

[ -f "$SRC/skin.json" ] || { echo "skin.json not found next to the installer ($SRC)" >&2; exit 1; }

# --- Steam -------------------------------------------------------------------
STEAM=""
for d in "${STEAM_DIR:-}" "$HOME/.steam/steam" "$HOME/.local/share/Steam" "$HOME/.steam/root" \
         "$HOME/.var/app/com.valvesoftware.Steam/.local/share/Steam" "$HOME/snap/steam/common/.local/share/Steam"; do
  [ -n "$d" ] && [ -d "$d/steamui" ] && { STEAM="$(readlink -f "$d")"; break; }
done
[ -n "$STEAM" ] && say "Steam: $STEAM" || say "Steam not found in the usual places (set STEAM_DIR or use --themes-dir)."

# --- Millennium's themes folder ----------------------------------------------
if [ -z "$THEMES" ]; then
  candidates=()
  [ -n "$STEAM" ] && candidates+=("$STEAM/millennium/themes" "$STEAM/steamui/skins")
  candidates+=("${XDG_DATA_HOME:-$HOME/.local/share}/millennium/themes" "$HOME/.local/share/millennium/themes")
  for d in "${candidates[@]}"; do
    [ -d "$d" ] && { THEMES="$d"; break; }
  done
fi
if [ -z "$THEMES" ]; then
  cat >&2 <<EOF
Millennium's themes folder was not found. Is Millennium installed (https://steambrew.app)?
Open Steam → Millennium → Themes, press the folder button, and run again with
  $0 --themes-dir "<that folder>"
EOF
  exit 1
fi
THEMES="$(readlink -f "$THEMES")"
say "Themes folder: $THEMES"
others=$(find "$THEMES" -mindepth 1 -maxdepth 1 -type d ! -name "$NAME" | wc -l)
say "Other themes there: $others (left as they are)"

# --- Backup, copy --------------------------------------------------------------
DEST="$THEMES/$NAME"
if [ -e "$DEST" ]; then
  BK="$(dirname "$THEMES")/aika-enhanced-backups/$(date +%Y%m%d-%H%M%S)"
  say "Backing up the installed $NAME to $BK"
  run mkdir -p "$BK"
  run mv "$DEST" "$BK/"
fi
say "Installing to $DEST"
run mkdir -p "$DEST"
if [ "$DRY" = 0 ]; then
  (cd "$SRC" && tar cf - --exclude=./.git --exclude=./tests --exclude=./tools --exclude=./install \
     --exclude=./node_modules --exclude=./.github .) | (cd "$DEST" && tar xf -)
  [ -f "$DEST/skin.json" ] && python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$DEST/skin.json" 2>/dev/null \
    && say "skin.json is valid" || say "Check $DEST/skin.json"
  # metadata.json: how Millennium -> Updates knows the installed commit (see install.ps1).
  COMMIT="$(git -C "$SRC" rev-parse HEAD 2>/dev/null || echo unknown)"
  python3 - "$DEST" "$COMMIT" <<'PY' && say "metadata.json written ($COMMIT)" || say "metadata.json not written"
import json, sys, os
dest, commit = sys.argv[1], sys.argv[2]
gh = json.load(open(os.path.join(dest, "skin.json"))).get("github") or {}
if gh.get("owner") and gh.get("repo_name"):
    json.dump({"commit": commit, "owner": gh["owner"], "repo": gh["repo_name"]}, open(os.path.join(dest, "metadata.json"), "w"), indent=4)
PY
fi

# --- Steam restart (optional, asks first) --------------------------------------
if [ "$RESTART" = 1 ] && pgrep -x steam >/dev/null 2>&1; then
  read -r -p "Steam is running and will be CLOSED and started again. Continue? [y/N] " ok
  if [ "${ok,,}" = "y" ]; then
    run steam -shutdown || true
    for _ in $(seq 1 30); do pgrep -x steam >/dev/null || break; sleep 1; done
    run nohup steam >/dev/null 2>&1 &
  else
    say "Steam left running. Restart it yourself to load the theme."
  fi
fi

cat <<EOF

Done. In Steam: Steam menu → Millennium → Themes → choose "Aika Enhanced"
(enable theme scripts if asked; on Linux they are required). The Friends Dock
settings are on its "Friends Dock" tab. Fully restart Steam after a first install.
EOF
