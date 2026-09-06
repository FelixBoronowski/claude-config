---
description: Run this turn on Sonnet instead of the session model — a per-turn cost gate for execution work whose design is already settled
argument-hint: <task, ticket, or /skill invocation to execute>
model: sonnet
---

This turn runs on a downgraded model as a deliberate cost gate: the planning that produced this task happened on the session model, and what remains is execution. Implement against the settled spec, don't reopen design decisions. If the task turns out to require real design judgment (ambiguous spec, contradiction with the code, an architectural fork), stop and say so instead of deciding; the user will re-run it on the session model.

Follow the project `CLAUDE.md` and the `stacks` skill: run the project's test command, lint the files you touch, both `en`/`de` for user-facing strings, never commit unless asked.

Task: $ARGUMENTS
