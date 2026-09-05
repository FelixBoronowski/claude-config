---
description: The lightweight path — resolve a single, well-scoped issue in a few files with no downstream dependencies, without spinning up the full orchestration apparatus.
argument-hint: <the bug or single change to make>
---

# /fix

A single issue in roughly three files or fewer, with no downstream dependencies, does not need a Change Dependency Graph or multiple tiers. Coordination overhead would cost more than the work. Handle it directly.

Issue: $ARGUMENTS

1. **Confirm it is a one-tier job.** If the change actually fans out across many files or alters a shared contract that other files consume, stop and use `/orchestrate` instead.

2. **Locate and understand** the relevant code before editing. Read the file(s) you intend to change.

3. **Pick the one specialist** whose domain this falls in and spawn it with the `Agent` tool (`backend-engineer`, `frontend-engineer`, `security-engineer`, `database-engineer`, `systems-engineer`, `devops-engineer`, or `test-engineer`). If the change touches auth, secrets, or network exposure, use the `security-engineer`.

4. **Gate the change.** Run a deterministic check (typecheck / test suite / build) — a non-zero exit blocks. A `hygiene-auditor` sweep is an optional add-on. If the change touches a live surface, an optional smoke check is also available.

5. **Report** what changed and why, and hand off for human approval. Commit nothing without it.

The discipline that makes the full loop work — read before you write, one owner per change, a hygiene sweep, human sign-off — still applies. You are just skipping the machinery a small change does not need.
