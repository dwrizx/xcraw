# AGENT.md - AI Operational Guidelines

This document outlines the strict protocols and guardrails for AI agents working on the **SmartExtract** repository. Adherence to these rules is mandatory to maintain the project's high-speed development loop and code quality.

## 🤖 Interaction Protocol

1.  **No Warnings Allowed:** Never ignore or bypass a linting warning or type error. If an error or warning exists, **fix it immediately**.
2.  **Clean State First:** Before starting a new task, ensure the environment is clean by running `bun run check:fast`.
3.  **Surgical Changes:** Apply only the necessary changes for the task. Avoid unrelated refactoring or "cleanups" unless explicitly requested.
4.  **Auto-Fix First:** Always prefer running `bun run fix` before manual formatting or linting fixes.

---

## 🛡️ Quality Guardrails

### 1. Verification is Mandatory

A task is NOT complete until the following command passes with **zero** errors and warnings:

```bash
bun run check
```

### 2. Linting & Formatting

- **Linter:** `oxlint` (Must be zero errors/warnings).
- **Formatter:** `oxfmt` (Must pass `fmt:check`).
- **Rule:** Never commit code if `bun run fmt:check` fails.

### 3. Type Safety

- **Type-checker:** `tsgo` (via `bun run typecheck`).
- **Rule:** All new components and logic must be fully typed. Avoid `any` at all costs.

---

## ✅ Checklist for Success (The "Final Gate")

Before submitting a pull request or finishing a task, you MUST:

- [ ] Run `bun run fix` to ensure perfect formatting and linting.
- [ ] Run `bun run typecheck` to verify TypeScript integrity.
- [ ] Run `bun run build` to ensure the extension compiles successfully for production.
- [ ] Verify that no new console errors or warnings were introduced in the content script or popup.
- [ ] Update `README.md` or `GEMINI.md` if your changes affect the project's architecture or commands.

---

## 🚦 CI/CD as the Final Judge

The GitHub Actions workflow defined in `.github/workflows/publish.yml` is the final authority. If the CI fails, the task is considered failed. Always ensure your local environment passes all checks before pushing.
