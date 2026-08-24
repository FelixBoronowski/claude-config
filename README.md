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
| `settings.json` | Main Claude Code settings (model, permissions, plugins, statusline, ...) |
| `CLAUDE.md` | Global instructions applied to every project |
| `hooks/` | Custom hook scripts (statusline) |
| `agents/` | Custom subagents (test-runner, ticket-implementer, ticket-implementer-hard) |

The statusline command in `settings.json` uses `~` and forward slashes
(`node ~/.claude/hooks/statusline.js`), which Claude Code expands portably on
Linux/WSL and Windows — so it can live in the shared file despite being a path.
Note: Claude Code does **not** read `~/.claude/settings.local.json`;
`settings.local.json` only works at the project level (`.claude/` inside a repo).

## What's machine-local (never in this repo)

Never commit: `~/.claude/.credentials.json`, `~/.claude.json`, `history.jsonl`,
`projects/`, `sessions/`, `plugins/`, `cache/` — these are auth tokens and per-machine
runtime state.
