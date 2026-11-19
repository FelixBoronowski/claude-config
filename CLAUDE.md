# Global Claude Code instructions

<!-- Instructions here apply to every project on every machine. -->

## Model routing (delegation gates)

The main session is the orchestrator. Route work by these gates:

**Thinking stays in the main session.** Planning and discussion skills — /grilling, /domain-modeling, /codebase-design, /diagnosing-bugs — always run inline. Never delegate the interviewing, speccing, or decision-making to a subagent.

**Small, fully known changes stay inline; everything else gets delegated.** Edit code inline when the exact change is already clear and small (roughly under 30 lines, e.g. a one-liner or a review-finding fix) — delegating it costs more in agent cold-start than it saves. Docs, ADRs, config, and memory also stay inline. When a larger task is agent-ready (spec complete, seams agreed, no open design questions), delegate it via the Agent tool:
- `coder` (Sonnet) is the default for almost all tasks, including moderately tricky ones. Agents read the project CLAUDE.md first, so repo traps belong there, not in per-project agent copies.
- `coder-hard` (Sonnet, high effort) for genuinely hard work: subtle safety or concurrency logic, cross-cutting changes, performance-sensitive code.

Batch small related fixes into one delegation rather than dripping one-liners. Pass the full task text plus any context the agent can't discover itself (relevant ADRs, CONTEXT.md vocabulary, file pointers). When the agent reports back, branch on its status token: `DONE` / `DONE_WITH_CONCERNS` → send the spec and diff scope to the `reviewer` agent (Opus, medium effort, read-only) instead of reading the diff inline, act on its findings, then commit from the main session; `BLOCKED` / `NEEDS_CONTEXT` → resolve in the main session and re-delegate. Inline changes skip the `reviewer`. Before merging a branch to develop, run the full suite via `test-runner`, then the built-in `/code-review` (not `/mattpocock-skills:code-review`) once per branch: `medium` normally, `high` for risky areas. Not per task. If a task still has open questions, resolve them in the main session first.

**Escalation:** if a coder agent stops and reports an ambiguity or missing decision, resolve it in the main session, then re-delegate. If the problem was difficulty rather than spec, escalate `coder` → `coder-hard` → `coder-hard` with `model: "opus"` on the Agent call.

**Code research gets delegated.** Reading source, call-site hunting, and diff reviews that need source reading go to the `reviewer`, `codebase-memory*`, Explore or general-purpose agents. Short `git status` / `git diff --stat`-level checks are fine inline.

**Check-running gets delegated.** When the only job is to run a test suite, single test file, typecheck, lint, or build and learn pass/fail (e.g. verification steps in /tdd), use the `test-runner` agent (Haiku) rather than running it inline — it keeps long logs out of the main context. Exception: during a tight red-green loop where you need to iterate on the failure output immediately, running inline is fine.

## Worktrees

- **Worktrees live beside the repo, never inside it:** `<repo>-worktrees/<name>` (e.g. `D:\dev\csgroup\invio-worktrees\feature-x`). Gitignored in-repo paths break formatters, duplicate code for indexers and test discovery, and inherit the parent's build config. The global `WorktreeCreate`/`WorktreeRemove` hooks (`~/.claude/hooks/worktree-*.js`) enforce this.
- **Create worktrees with `EnterWorktree` or `isolation: "worktree"`, never `git worktree add` via Bash** — Bash bypasses the hook, so you get no submodules, no copied files, wrong location.
- The hook branches off the current `HEAD`, checks out submodules with `--reference` to the main checkout (objects shared, no re-download), copies gitignored files listed in the repo's `.worktreeinclude`, then runs `<repo>/.claude/worktree-setup.ps1` if present (env `MAIN_CHECKOUT`). Repo-specific setup goes in that script — never add a second `WorktreeCreate` hook in a project's settings.
- **The hook names the branch after the worktree** (e.g. `agent-a1b2…`). Rename it to the repo's convention (`git branch -m feature/<topic>`) before pushing.
- **Agents' worktrees are the orchestrator's to clean up:** `WorktreeRemove` does not fire when a subagent finishes. Once the branch is merged, remove it: `echo '{"worktree_path":"<path>"}' | node ~/.claude/hooks/worktree-remove.js` (deletes the folder, prunes, `git branch -d`s a merged branch).
