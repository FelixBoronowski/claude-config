# Global Claude Code instructions

<!-- Instructions here apply to every project on every machine. -->

## Model routing (delegation gates)

The main session runs on Fable and is the orchestrator. Route work by these gates:

**Thinking stays in the main session.** Planning and discussion skills — /grilling, /grill-me, /grill-with-docs, /to-spec, /to-tickets, /wayfinder, /triage, /domain-modeling, /codebase-design, /diagnosing-bugs — always run inline. Never delegate the interviewing, speccing, or decision-making to a subagent.

**Well-specced tickets get delegated.** During /implement, when a ticket is agent-ready (spec complete, seams agreed, no open design questions), delegate the whole ticket via the Agent tool instead of implementing inline:
- `ticket-implementer` (Sonnet) for straightforward tickets.
- `ticket-implementer-hard` (Opus, high effort) for tickets with tricky logic, cross-cutting changes, or performance-sensitive code.

Pass the full ticket text plus any context the agent can't discover itself (relevant ADRs, CONTEXT.md vocabulary, file pointers). When the agent reports back, review the diff, run /code-review, and commit from the main session. If a ticket still has open questions, resolve them in the main session first — or implement it inline.

**Escalation:** if an implementer agent stops and reports an ambiguity or missing decision, resolve it in the main session, then re-delegate (escalating to `ticket-implementer-hard` if the problem was difficulty rather than spec).

**Check-running gets delegated.** When the only job is to run a test suite, single test file, typecheck, lint, or build and learn pass/fail (e.g. verification steps in /implement or /tdd), use the `test-runner` agent (Haiku) rather than running it inline — it keeps long logs out of the main context. Exception: during a tight red-green loop where you need to iterate on the failure output immediately, running inline is fine.
