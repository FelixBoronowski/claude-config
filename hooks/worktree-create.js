#!/usr/bin/env node
'use strict';

/*
 * worktree-create.js
 *
 * Claude Code WorktreeCreate hook. Puts the worktree beside the repo:
 *   <parent>/<repo>-worktrees/<name>
 * on branch <name> (based on the current HEAD of cwd), checks out
 * submodules borrowing objects from the main checkout (--reference), copies
 * the files listed in .worktreeinclude and runs .claude/worktree-setup.ps1.
 *
 * Contract: the absolute worktree path is the only stdout line; everything
 * else (git output included) goes to stderr.
 *
 *   node ~/.claude/hooks/worktree-create.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// git must never wait for credentials in a hook nobody can type into.
process.env.GIT_TERMINAL_PROMPT = '0';
process.env.GCM_INTERACTIVE = 'never';
const MAX_BUFFER = 256 * 1024 * 1024;

function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: MAX_BUFFER });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

// Runs a command with its stdout and stderr both sent to our stderr.
function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, { stdio: ['ignore', 2, 2], windowsHide: true, ...opts });
  return r.status === 0;
}

function fail(msg) {
  process.stderr.write(`worktree-create: ${msg}\n`);
  process.exit(1);
}

function warn(msg) {
  process.stderr.write(`worktree-create: warning: ${msg}\n`);
}

function initSubmodules(main, wt) {
  // -z records are "key\nvalue\0", so paths with spaces survive.
  const r = git(['config', '-z', '-f', path.join(wt, '.gitmodules'), '--get-regexp', '^submodule\\..*\\.path$']);
  const subs = r.ok ? r.out.split('\0').filter(Boolean).map((rec) => rec.slice(rec.indexOf('\n') + 1)) : [];
  for (const sub of subs) {
    const ref = path.join(main, sub);
    if (fs.existsSync(path.join(ref, '.git'))) {
      if (run('git', ['-C', wt, 'submodule', 'update', '--init', '--reference', ref, '--', sub])) continue;
      warn(`submodule ${sub}: --reference ${ref} failed (e.g. dubious ownership), retrying without it`);
    }
    if (!run('git', ['-C', wt, 'submodule', 'update', '--init', '--', sub])) {
      warn(`submodule ${sub} could not be initialised`);
    }
  }
  return subs;
}

function copyIncludes(main, wt, subPaths) {
  const includeFile = path.join(main, '.worktreeinclude');
  if (!fs.existsSync(includeFile)) return;
  const r = spawnSync('git', ['-C', main, 'ls-files', '-z', '--others', '--ignored', `--exclude-from=${includeFile}`],
    { encoding: 'utf8', windowsHide: true, maxBuffer: MAX_BUFFER });
  if (r.status !== 0) {
    warn(`listing .worktreeinclude files failed: ${(r.stderr || '').trim()}`);
    return;
  }
  for (const file of r.stdout.split('\0').filter(Boolean)) {
    if (subPaths.some((s) => file === s || file.startsWith(`${s}/`))) continue;
    try {
      const dest = path.join(wt, file);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(main, file), dest);
    } catch (err) {
      warn(`could not copy ${file}: ${err.message}`);
    }
  }
}

function runSetupScript(main, wt) {
  const script = path.join(main, '.claude', 'worktree-setup.ps1');
  if (!fs.existsSync(script)) return;
  const ok = run('pwsh', ['-NoProfile', '-NonInteractive', '-File', script], { cwd: wt, env: { ...process.env, MAIN_CHECKOUT: main } });
  if (!ok) warn(`${script} failed`);
}

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch (err) {
    fail(`invalid hook input: ${err.message}`);
  }
  const { cwd, name } = input;
  if (!cwd || !name) fail('hook input needs cwd and name');

  const common = git(['-C', cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (!common.ok) fail(`not a git repository: ${cwd}\n${common.err}`);
  const main = path.dirname(path.resolve(common.out));
  const base = git(['-C', cwd, 'rev-parse', 'HEAD']);
  if (!base.ok) fail(`cannot resolve HEAD in ${cwd}\n${base.err}`);

  const wtRoot = path.join(path.dirname(main), `${path.basename(main)}-worktrees`);
  const wt = path.resolve(wtRoot, name);
  const rel = path.relative(wtRoot, wt);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) fail(`invalid worktree name: ${name}`);
  if (fs.existsSync(wt)) fail(`worktree path already exists: ${wt}`);

  const branchExists = git(['-C', main, 'show-ref', '--verify', '--quiet', `refs/heads/${name}`]).ok;
  const madeDir = fs.mkdirSync(path.dirname(wt), { recursive: true });
  const added = branchExists
    ? run('git', ['-C', main, 'worktree', 'add', wt, name])
    : run('git', ['-C', main, 'worktree', 'add', '-b', name, wt, base.out]);
  if (!added) {
    // Undo what we created so a failed creation leaves nothing behind.
    if (!branchExists) git(['-C', main, 'branch', '-D', name]);
    if (madeDir) fs.rmSync(madeDir, { recursive: true, force: true });
    fail(`git worktree add failed for ${wt}`);
  }

  const subPaths = initSubmodules(main, wt);
  copyIncludes(main, wt, subPaths);
  runSetupScript(main, wt);

  process.stdout.write(`${fs.realpathSync.native(wt)}\n`);
}

main();
