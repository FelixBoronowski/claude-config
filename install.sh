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

# Machine-specific settings (absolute paths etc.) live in settings.local.json,
# which is NOT tracked in the repo. Create it with the statusline config if missing.
LOCAL="$CLAUDE_DIR/settings.local.json"
if [ ! -f "$LOCAL" ]; then
  cat > "$LOCAL" <<EOF
{
  "statusLine": {
    "type": "command",
    "command": "node \"$HOME/.claude/hooks/statusline.js\""
  },
  "subagentStatusLine": {
    "type": "command",
    "command": "node \"$HOME/.claude/hooks/statusline.js\" subagent"
  }
}
EOF
  echo "created:   $LOCAL"
else
  echo "kept:      $LOCAL (make sure it contains the statusLine config, see README)"
fi

echo "Done."
