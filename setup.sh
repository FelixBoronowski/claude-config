#!/usr/bin/env bash
# One-time per-machine setup for things that live outside this repo
# (user-scoped MCP registrations in ~/.claude.json). Idempotent.
set -euo pipefail

if command -v codebase-memory-mcp >/dev/null 2>&1; then
  if claude mcp get codebase-memory-mcp >/dev/null 2>&1; then
    echo "codebase-memory-mcp already registered"
  else
    claude mcp add --scope user codebase-memory-mcp -- codebase-memory-mcp
  fi
else
  echo "codebase-memory-mcp binary not on PATH — install it first, then re-run this script" >&2
fi
