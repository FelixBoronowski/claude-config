# Global Claude Code instructions

<!-- Instructions here apply to every project on every machine. -->

## Model routing (delegation gates)

The main session runs on Fable and is the orchestrator. Route work by these gates:

**Thinking stays in the main session.** Planning and discussion skills — /grilling, /grill-me, /grill-with-docs, /to-spec, /to-tickets, /wayfinder, /triage, /domain-modeling, /codebase-design, /diagnosing-bugs — always run inline. Never delegate the interviewing, speccing, or decision-making to a subagent.

**ALL coding gets delegated.** The main session never edits code inline — not even one-liners or review-finding fixes (docs, ADRs, config, and memory stay inline). When a task is agent-ready (spec complete, seams agreed, no open design questions), delegate it via the Agent tool:
- `coder` (Sonnet) for straightforward tasks. Agents read the project CLAUDE.md first, so repo traps belong there, not in per-project agent copies.
- `coder-hard` (Opus, high effort) for tasks with tricky logic, cross-cutting changes, or performance-sensitive code.

Batch small related fixes into one delegation rather than dripping one-liners. Pass the full task text plus any context the agent can't discover itself (relevant ADRs, CONTEXT.md vocabulary, file pointers). When the agent reports back, branch on its status token: `DONE` / `DONE_WITH_CONCERNS` → send the spec and diff scope to the `reviewer` agent (Opus, read-only) instead of reading the diff inline, act on its findings, then commit from the main session; `BLOCKED` / `NEEDS_CONTEXT` → resolve in the main session and re-delegate. Run /code-review once per branch before merging, not per task. If a task still has open questions, resolve them in the main session first.

**Escalation:** if a coder agent stops and reports an ambiguity or missing decision, resolve it in the main session, then re-delegate (escalating to `coder-hard` if the problem was difficulty rather than spec).

**Check-running gets delegated.** When the only job is to run a test suite, single test file, typecheck, lint, or build and learn pass/fail (e.g. verification steps in /implement or /tdd), use the `test-runner` agent (Haiku) rather than running it inline — it keeps long logs out of the main context. Exception: during a tight red-green loop where you need to iterate on the failure output immediately, running inline is fine.
