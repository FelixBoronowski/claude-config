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

Then register the user-scoped MCP servers (they live in `~/.claude.json`, which is
never tracked):

```bash
bash ~/.claude/setup.sh
```

## What else to install

The repo only carries config. Each machine also needs:

| What | Why | Install |
|---|---|---|
| Git | `~/.claude` is a checkout; the sync check runs `git` | Git for Windows (brings Git Bash, which Claude Code uses for hook commands) |
| Node.js | Runs `hooks/cbm-hook.js`, `hooks/config-sync-check.js` and `hooks/statusline.js` | Any current LTS; must be on `PATH` |
| [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) | MCP server behind the `codebase-memory*` agents, the `codebase-memory` skill and `cbm-hook.js` | Its installer, then `setup.sh`. The installer rewrites tracked files — see [codebase-memory-mcp hooks](#codebase-memory-mcp-hooks) |
| `mattpocock-skills` plugin | `/tdd`, `/grilling`, `/code-review` and the other skills `CLAUDE.md` routes to | `/plugin`, from the `claude-plugins-official` marketplace; `settings.json` already enables it |

Known versions: 0.11.0 (updated 2026-09-28). On Windows the binary lives in
`%LOCALAPPDATA%\Programs\codebase-memory-mcp` and updates replace it in place.

**After running any installer or updater, review `git diff` in `~/.claude` before
committing.** Installers write straight into tracked files.

## Model

`settings.json` deliberately sets no `model`: each machine starts on whatever you
pick with `/model` or `claude --model`. If `/model` writes a `model` key back into
`settings.json`, that shows up as a diff — don't commit it.

## Day-to-day

- Changed a setting, agent, or hook here: `cd ~/.claude && git status`, review, commit, push.
- On another machine: `cd ~/.claude && git pull`.
- Claude Code and installers edit `settings.json` in place (plugin toggles, hook
  registrations). Those show up as diffs; commit them like any other change.

### Sync check

`hooks/config-sync-check.js` runs on every new session (SessionStart `startup`). It
fetches `origin` and warns, visibly and in Claude's context, when `~/.claude`:

- is not a git checkout of this repo (the machine was never set up),
- has uncommitted or untracked changes,
- is behind `origin/main` or has unpushed commits.

It prints nothing when everything is in sync, skips the remote check when offline,
and never changes the repo apart from the fetch.

## What's synced

| Path | Purpose |
|---|---|
| `settings.json` | Main Claude Code settings (model, permissions, plugins, statusline, hooks) |
| `CLAUDE.md` | Global instructions applied to every project |
| `hooks/` | Hook scripts (statusline, sync check, codebase-memory adapter) |
| `agents/` | Custom subagents (coder, coder-hard, reviewer, test-runner, ...) |
| `setup.sh` | Per-machine bootstrap for user-scoped MCP registrations |
| `commands/` | Custom slash commands |
| `skills/` | Custom skills (`stacks`, `codebase-memory`) |

The hook and statusline commands in `settings.json` resolve the home directory as
`${USERPROFILE:-$HOME}` with forward slashes, so they work on Linux/WSL and Windows.
Do not use `~`: Claude Code runs commands in Git Bash on Windows, where `~` follows
`HOMEDRIVE` (a network drive on domain machines) while Claude Code itself keeps
`.claude` under `USERPROFILE`.
Note: Claude Code does **not** read `~/.claude/settings.local.json`;
`settings.local.json` only works at the project level (`.claude/` inside a repo).

## codebase-memory-mcp hooks

The MCP installer registers hooks in `settings.json` that call platform-specific
scripts (`cmd.exe` + `.cmd` on Windows, `sh` on Linux). This repo replaces them
with one portable adapter, `hooks/cbm-hook.js`, registered as
`node ~/.claude/hooks/cbm-hook.js`. It finds the binary per platform (`CBM_BIN`
override, the default install dir, then PATH) and fails open when it is missing.

We register the same hook events the installer does (PreToolUse Grep/Glob/Bash,
PostToolUse Read, SessionStart, SubagentStart), all through `cbm-hook.js`. When an
update changes that set, mirror it here. As of 0.11.0 `hook-augment` prints nothing
for any event and takes ~2.3 s per call (upstream #1335, #2058); we keep the hooks
anyway so they start working as soon as a release fixes that.

On Windows, `codebase-memory-mcp update` only points you at
`install.ps1`; quit every Claude Code session first, since the running MCP server
locks the binary. The installer:

- replaces the binary in place, even when it reports `installation failed`;
- fails on our three `codebase-memory*` agents (`preserved modified profile`) —
  expected, our copies are intentional;
- appends its own hook entries next to ours, using an `args` key Claude Code
  does not support (upstream #2239), and drops its `cbm-*.cmd` / `cbm-*.sh`
  scripts again.

Restore the portable setup with:

```bash
cd ~/.claude && git checkout -- settings.json skills/ && git clean -f hooks/
```

then commit anything else the update changed.

## What's machine-local (never tracked)

Everything not whitelisted in `.gitignore`: `.credentials.json`, `.claude.json`
(lives one level up), `history.jsonl`, `projects/`, `sessions/`, `plugins/`, `cache/`, and so on.
