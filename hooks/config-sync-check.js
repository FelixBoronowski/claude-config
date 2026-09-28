#!/usr/bin/env node
'use strict';

/*
 * config-sync-check.js
 *
 * SessionStart hook that warns when this machine's Claude Code config
 * (~/.claude, a checkout of FelixBoronowski/claude-config, branch main) is out
 * of sync with the shared git repo:
 *
 *   - the config dir is not a checkout of the repo at all,
 *   - there are uncommitted / untracked changes,
 *   - the local branch does not track its origin counterpart,
 *   - the local branch is behind or ahead of its upstream.
 *
 * If everything is in sync it prints nothing. Otherwise it prints one JSON
 * object with a systemMessage (shown to the user) and additionalContext
 * (shown to Claude). Fail-open: any error exits 0 with no output. The only
 * thing it ever changes in the repo is `git fetch`.
 *
 * All git calls are blocking, so the total run time is bounded by a shared
 * deadline: each call gets min(its own timeout, time left), and remaining
 * calls are skipped once the budget is gone. The budget stays below the
 * hook timeout registered in settings.json (10 s).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BUDGET_MS = 7000;
const GIT_TIMEOUT_MS = 3000;
const FETCH_TIMEOUT_MS = 5000;

const deadline = Date.now() + BUDGET_MS;

function exitZero() {
  try {
    process.exit(0);
  } catch (_err) {
    // stay fail-open
  }
}

function git(dir, args, defaultTimeout, extra) {
  const left = deadline - Date.now();
  if (left <= 0) throw new Error('time budget exhausted');
  return execFileSync('git', args, {
    cwd: dir,
    timeout: Math.min(defaultTimeout || GIT_TIMEOUT_MS, left),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...extra,
  });
}

function realpath(p) {
  try {
    return fs.realpathSync.native(p);
  } catch (_err) {
    return path.resolve(p);
  }
}

function samePath(a, b) {
  const norm = (p) => realpath(p).replace(/[\\/]+$/, '');
  const x = norm(a);
  const y = norm(b);
  return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y;
}

function plural(n, word) {
  return n + ' ' + word + (n === 1 ? '' : 's');
}

function collectWarnings(dir, label) {
  const warnings = [];

  // a. Must be the top level of a git work tree.
  try {
    const [inside, top] = git(dir, ['rev-parse', '--is-inside-work-tree', '--show-toplevel'])
      .trim()
      .split(/\r?\n/);
    if (inside !== 'true' || !top || !samePath(top, dir)) throw new Error('not a checkout');
  } catch (_err) {
    warnings.push(label + ' is not a checkout of claude-config — see the README "Setup on a new machine".');
    return warnings;
  }

  // b. Uncommitted / untracked files.
  try {
    const lines = git(dir, ['status', '--porcelain']).split(/\r?\n/).filter(Boolean);
    if (lines.length > 0) {
      warnings.push(
        plural(lines.length, 'changed/untracked file') + ' in ' + label + ' — review, then commit and push (or discard)'
      );
    }
  } catch (_err) {
    // skip
  }

  // c. Upstream tracking (needs no network), then ahead/behind.
  let branch = null;
  try {
    branch = git(dir, ['symbolic-ref', '--short', '-q', 'HEAD']).trim() || null;
  } catch (_err) {
    // detached HEAD or failure
  }
  if (!branch) {
    warnings.push('HEAD is detached, not on main');
    return warnings;
  }

  let tracked = true;
  try {
    git(dir, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
  } catch (_err) {
    tracked = false;
  }
  if (!tracked) {
    warnings.push(branch + ' does not track origin/' + branch);
    return warnings;
  }

  // Never let the fetch prompt for credentials (GCM dialog, tty, ssh).
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
  if (!env.GIT_SSH_COMMAND) env.GIT_SSH_COMMAND = 'ssh -o BatchMode=yes';
  let fetched = true;
  try {
    git(dir, ['fetch', '--quiet', 'origin'], FETCH_TIMEOUT_MS, { env, stdio: 'ignore' });
  } catch (_err) {
    fetched = false; // offline: skip ahead/behind silently
  }
  if (!fetched) return warnings;

  try {
    const [ahead, behind] = git(dir, ['rev-list', '--left-right', '--count', 'HEAD...@{upstream}'])
      .trim()
      .split(/\s+/)
      .map((n) => parseInt(n, 10));
    if (behind > 0) warnings.push('behind origin/' + branch + ' by ' + plural(behind, 'commit') + ' — git pull');
    if (ahead > 0) warnings.push(plural(ahead, 'unpushed commit') + ' — git push');
  } catch (_err) {
    // skip
  }

  return warnings;
}

function main() {
  const configured = process.env.CLAUDE_CONFIG_DIR;
  const dir = configured || path.join(__dirname, '..');
  const label = configured ? configured : '~/.claude';
  const warnings = collectWarnings(dir, label);
  if (warnings.length === 0) return;

  const text = 'claude-config: ' + warnings.join('; ');
  process.stdout.write(
    JSON.stringify({
      systemMessage: text,
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text },
    }) + '\n'
  );
}

try {
  main();
  process.exitCode = 0;
} catch (_err) {
  exitZero();
}
