#!/usr/bin/env node
'use strict';

/*
 * cbm-hook.js
 *
 * Cross-platform Claude Code hook adapter for codebase-memory-mcp.
 *
 * Replaces the Windows-only cbm-*.cmd scripts that the codebase-memory-mcp
 * installer used to register for PreToolUse / PostToolUse / SessionStart /
 * SubagentStart. Each of those .cmd scripts did exactly this:
 *
 *   set BIN=<absolute path to codebase-memory-mcp.exe>
 *   if not exist "%BIN%" exit /b 0
 *   "%BIN%" hook-augment 2>NUL
 *   exit /b 0
 *
 * i.e.: locate the codebase-memory-mcp binary, run it with the single
 * argument "hook-augment", forward the hook's JSON stdin to it, forward its
 * stdout back to Claude Code, discard its stderr, and always exit 0
 * (fail-open) regardless of what happens.
 *
 * This script does the same thing in plain Node.js so it works identically
 * on Windows, macOS and Linux when registered as:
 *
 *   node ~/.claude/hooks/cbm-hook.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const SAFETY_TIMEOUT_MS = 4000;

function findBinary() {
  const exeName = process.platform === 'win32'
    ? 'codebase-memory-mcp.exe'
    : 'codebase-memory-mcp';

  const candidates = [];

  if (process.env.CBM_BIN) {
    candidates.push(process.env.CBM_BIN);
  }

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      candidates.push(path.join(localAppData, 'Programs', 'codebase-memory-mcp', 'codebase-memory-mcp.exe'));
    }
  } else {
    const home = os.homedir();
    if (home) {
      candidates.push(path.join(home, '.local', 'bin', 'codebase-memory-mcp'));
    }
    candidates.push('/usr/local/bin/codebase-memory-mcp');
  }

  for (const candidate of candidates) {
    try {
      if (candidate && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch (_err) {
      // not found, keep looking
    }
  }

  // Search PATH entries.
  const pathEnv = process.env.PATH || '';
  const pathEntries = pathEnv.split(path.delimiter).filter(Boolean);
  for (const entry of pathEntries) {
    const candidate = path.join(entry, exeName);
    try {
      if (fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch (_err) {
      // not found, keep looking
    }
  }

  return null;
}

function readStdin() {
  try {
    // fd 0 may already be closed (e.g. run manually with no input); treat
    // any failure as empty input.
    return fs.readFileSync(0);
  } catch (_err) {
    return Buffer.alloc(0);
  }
}

function exitZero() {
  try {
    process.exit(0);
  } catch (_err) {
    // process.exit should never throw, but stay fail-open regardless
  }
}

function main() {
  let bin;
  try {
    bin = findBinary();
  } catch (_err) {
    bin = null;
  }

  if (!bin) {
    exitZero();
    return;
  }

  const input = readStdin();

  let settled = false;
  let child;

  // Normal path (child 'close' or 'error'): let the process exit naturally
  // once nothing is pending, so a still-flushing write to process.stdout
  // isn't cut off.
  const finish = () => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    process.exitCode = 0;
  };

  // Timeout path: the child has already been killed, so its stdout pipe
  // may never emit 'close'. Exit immediately rather than risk hanging.
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    try {
      if (child) child.kill();
    } catch (_err) {
      // ignore
    }
    exitZero();
  }, SAFETY_TIMEOUT_MS);
  if (typeof timer.unref === 'function') timer.unref();

  try {
    child = spawn(bin, ['hook-augment'], {
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true,
    });
  } catch (_err) {
    finish();
    return;
  }

  child.on('error', () => {
    finish();
  });

  try {
    child.stdout.pipe(process.stdout);
  } catch (_err) {
    // ignore; still fail-open on close/error/exit below
  }

  try {
    child.stdin.on('error', () => {
      // ignore EPIPE / write errors on stdin, stay fail-open
    });
    child.stdin.write(input);
    child.stdin.end();
  } catch (_err) {
    // ignore; process still exits fail-open when the child settles
  }

  child.on('close', finish);
}

try {
  main();
} catch (_err) {
  exitZero();
}
