---
name: stacks
description: Per-stack build/test/lint commands and conventions (.NET, Ruby, Python). Preloaded by coder agents; invoke manually when you need the house toolchain for a stack.
---

Detect the stack from the repo root. A project `CLAUDE.md` or project skill overrides anything here (env wrappers, exact commands).

| Stack | Detect | Test | Lint / format | Notes |
|---|---|---|---|---|
| .NET / ASP.NET | `*.sln`, `*.csproj` | `dotnet test <test.csproj>` | `dotnet csharpier format <files>` | TUnit is the target framework (`[Test]`, `await Assert.That(...)`); xUnit is legacy. Follow whatever the test project already references, never mix or migrate on the side. |
| Ruby / Rails | `Gemfile` | `bundle exec rspec <path>` | `bundle exec rubocop <files>` | Services expose a single `.call`. |
| Python | `pyproject.toml` | `uv run pytest -x <path>` | `uv run ruff check --fix <files>` then `uv run ruff format <files>` | `uv` only: `uv sync`, `uv add`, `uv run`. Never `pip install` or activate a venv by hand. |

Always: lint/format only the files you touched, fix offenses in lines you wrote, leave pre-existing offenses alone. User-facing strings get both `en` and `de` locale entries.
