#!/usr/bin/env node
'use strict';

/*
 * worktree-remove.js
 *
 * Claude Code WorktreeRemove hook, the counterpart of worktree-create.js.
 *
 * Deletes the worktree folder directly (git worktree remove refuses
 * worktrees with initialised submodules). A recursive delete through a
 * junction or symlink would wipe its target, so the delete is refused while
 * any link inside the worktree points outside it.
 *
 *   node ~/.claude/hooks/worktree-remove.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// git must never wait for credentials in a hook nobody can type into.
process.env.GIT_TERMINAL_PROMPT = '0';
process.env.GCM_INTERACTIVE = 'never';

function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

function log(msg) {
  process.stderr.write(`worktree-remove: ${msg}\n`);
}

function fail(msg) {
  log(msg);
  process.exit(1);
}

function mainCheckout(dir) {
  if (!dir) return null;
  const r = git(['-C', dir, 'rev-parse', '--path-format=absolute', '--git-common-dir']);
  return r.ok ? path.dirname(path.resolve(r.out)) : null;
}

const norm = (p) => path.resolve(p).toLowerCase();

// Refuses anything that is not a linked worktree of main inside <main>-worktrees.
function assertLinkedWorktree(main, wt) {
  if (!main) fail(`no git repository found for ${wt}; nothing deleted`);
  const wtRoot = path.join(path.dirname(main), `${path.basename(main)}-worktrees`);
  const rel = path.relative(norm(wtRoot), norm(wt));
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) fail(`${wt} is not inside ${wtRoot}; nothing deleted`);
  const list = git(['-C', main, 'worktree', 'list', '--porcelain']);
  if (!list.ok) fail(`git worktree list failed: ${list.err}; nothing deleted`);
  const linked = list.out.split('\n')
    .filter((l) => l.startsWith('worktree '))
    .slice(1) // the first entry is the main checkout
    .map((l) => norm(l.slice('worktree '.length).trim()));
  if (!linked.includes(norm(wt))) fail(`${wt} is not a linked worktree of ${main}; nothing deleted`);
}

// Returns the first link under dir whose target lies outside root, or null.
function findOutsideLink(dir, root) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const target = path.resolve(dir, fs.readlinkSync(full));
      const rel = path.relative(root, target);
      if (rel.startsWith('..') || path.isAbsolute(rel)) return full;
    } else if (entry.isDirectory()) {
      const found = findOutsideLink(full, root);
      if (found) return found;
    }
  }
  return null;
}

// Removes empty dirs from dir upwards, ending at the enclosing *-worktrees folder.
function removeEmptyParents(dir) {
  let stop = dir;
  while (!path.basename(stop).endsWith('-worktrees')) {
    if (path.dirname(stop) === stop) return; // not one of our worktrees
    stop = path.dirname(stop);
  }
  for (let d = dir; ; d = path.dirname(d)) {
    try {
      fs.rmdirSync(d); // fails on a non-empty dir
    } catch (_err) {
      return;
    }
    if (d === stop) return;
  }
}

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch (err) {
    fail(`invalid hook input: ${err.message}`);
  }
  if (!input.worktree_path) fail('hook input needs worktree_path');
  const wt = path.resolve(input.worktree_path);

  const main = mainCheckout(wt) || mainCheckout(input.cwd);
  const branch = git(['-C', wt, 'branch', '--show-current']);

  if (fs.existsSync(wt)) {
    assertLinkedWorktree(main, wt);
    const link = findOutsideLink(wt, wt);
    if (link) fail(`link ${link} points outside the worktree; nothing deleted`);
    try {
      fs.rmSync(wt, { recursive: true, force: true });
    } catch (err) {
      log(`deleting ${wt} failed: ${err.message}`);
      git(['-C', main, 'worktree', 'prune']);
      process.exit(1);
    }
  }

  if (main) {
    git(['-C', main, 'worktree', 'prune']);
    if (branch.ok && branch.out) {
      const del = git(['-C', main, 'branch', '-d', branch.out]);
      if (!del.ok) log(`kept branch ${branch.out}: ${del.err}`);
    }
  } else {
    log('main checkout not found; skipped worktree prune and branch cleanup');
  }

  removeEmptyParents(path.dirname(wt));
}

main();
