# claude-config

Shared [Claude Code](https://claude.ai/code) configuration, synced across machines
(WSL2, Windows, future PCs). `~/.claude` **is** the git checkout: no symlinks, no copy
step. Every tool (Claude Code itself, MCP installers, plugins) writes plain files,
and their edits show up in `git status` for review and commit.

A whitelist `.gitignore` ignores everything by default and un-ignores only the shared
files, so credentials and runtime state can never be committed by accident.

## Setup on a new machine

`~/.claude` usually already exists (Claude Code creates it on first run), so clone
into the existing folder:

```bash
# WSL2 / Linux / macOS
cd ~/.claude
git init -b main
git remote add origin https://github.com/FelixBoronowski/claude-config
git fetch origin
git checkout -f -t origin/main
```

```powershell
# Windows
Set-Location $env:USERPROFILE\.claude
git init -b main
git remote add origin https://github.com/FelixBoronowski/claude-config
git fetch origin
git checkout -f -t origin/main
```

`checkout -f` overwrites any default `settings.json` Claude Code generated; back it up
first if it has anything you want to keep.

## Day-to-day

- Changed a setting, agent, or hook here: `cd ~/.claude && git status`, review, commit, push.
- On another machine: `cd ~/.claude && git pull`.
- Claude Code and installers edit `settings.json` in place (plugin toggles, hook
  registrations). Those show up as diffs; commit them like any other change.

## What's synced

| Path | Purpose |
|---|---|
| `settings.json` | Main Claude Code settings (model, permissions, plugins, statusline, hooks) |
| `CLAUDE.md` | Global instructions applied to every project |
| `hooks/` | Hook scripts (statusline, installer-provided hooks) |
| `agents/` | Custom subagents (coder, coder-hard, test-runner, ...) |
| `commands/` | Custom slash commands |

The statusline command in `settings.json` uses `~` and forward slashes
(`node ~/.claude/hooks/statusline.js`), which Claude Code expands portably on
Linux/WSL and Windows.
Note: Claude Code does **not** read `~/.claude/settings.local.json`;
`settings.local.json` only works at the project level (`.claude/` inside a repo).

## What's machine-local (never tracked)

Everything not whitelisted in `.gitignore`: `.credentials.json`, `.claude.json`
(lives one level up), `history.jsonl`, `projects/`, `sessions/`, `plugins/`, `cache/`,
`skills/` (installer-managed), and so on.
