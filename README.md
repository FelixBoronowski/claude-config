# claude-config

Shared [Claude Code](https://claude.ai/code) configuration, synced across machines
(WSL2, Windows, future PCs) via symlinks into `~/.claude`.

## Setup on a new machine

```bash
# WSL2 / Linux / macOS
git clone <remote-url> ~/dev/claude-config
~/dev/claude-config/install.sh
```

```powershell
# Windows (Developer Mode recommended, so symlinks work without admin)
git clone <remote-url> $env:USERPROFILE\dev\claude-config
& "$env:USERPROFILE\dev\claude-config\install.ps1"
```

After changing settings on one machine: commit + push there, `git pull` on the others.
Symlinked machines pick changes up immediately; if the Windows install fell back to
copying (no symlink permission), re-run `install.ps1` after pulling.

## What's synced

| File | Purpose |
|---|---|
| `settings.json` | Main Claude Code settings (model, permissions, plugins, ...) |
| `CLAUDE.md` | Global instructions applied to every project |
| `hooks/` | Custom hook scripts (statusline) |

## What's machine-local (never in this repo)

`~/.claude/settings.local.json` holds machine-specific overrides — anything with an
absolute path, like the statusline command. The install script creates it if missing:

```json
{
  "statusLine": { "type": "command", "command": "node \"<home>/.claude/hooks/statusline.js\"" },
  "subagentStatusLine": { "type": "command", "command": "node \"<home>/.claude/hooks/statusline.js\" subagent" }
}
```

Also never commit: `~/.claude/.credentials.json`, `~/.claude.json`, `history.jsonl`,
`projects/`, `sessions/`, `plugins/`, `cache/` — these are auth tokens and per-machine
runtime state.
