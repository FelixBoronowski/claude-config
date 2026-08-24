#!/usr/bin/env bash
# Symlinks the shared Claude Code config from this repo into ~/.claude.
# Safe to re-run; existing real files are backed up with a timestamp suffix.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$CLAUDE_DIR"

link() {
  local src="$REPO_DIR/$1" dst="$CLAUDE_DIR/$1"
  if [ -e "$dst" ] && [ ! -L "$dst" ]; then
    mv "$dst" "$dst.backup.$STAMP"
    echo "backed up: $dst -> $dst.backup.$STAMP"
  fi
  ln -sfn "$src" "$dst"
  echo "linked:    $dst -> $src"
}

link settings.json
link CLAUDE.md
link hooks
link agents

# NOTE: Claude Code does NOT read ~/.claude/settings.local.json (settings.local.json is
# project-level only). All shared config, including the statusline command (written with
# portable "~" + forward slashes), lives in the tracked settings.json.

echo "Done."
