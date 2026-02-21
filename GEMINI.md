# GEMINI.md - SmartExtract v2.4.1 Context

This file provides the necessary context and instructions for AI agents working on the **SmartExtract** project.

## 🚀 Project Overview

**SmartExtract** is a high-performance browser extension built with the [WXT](https://wxt.dev/) framework. It allows users to extract web content (full page, selection, or visual picking) into clean, structured **Markdown (GFM)** or **Plain Text**.

### Core Tech Stack

- **Framework:** WXT (Web Extension Framework)
- **Frontend:** React 19 + Tailwind CSS v4
- **Runtime:** Bun
- **Icons:** Lucide React
- **Logic:** `@mozilla/readability` (extraction), `turndown` + `gfm` (Markdown conversion), `dompurify` (sanitization).
- **Messaging:** `@webext-core/messaging` (type-safe inter-component communication).

---

## 🛠️ Building and Running

### Development

- `bun run dev`: Start the extension in development mode with hot-reloading.
- `bun run compile`: Run `tsc --noEmit` to check for TypeScript errors.

### Production & Distribution

- `bun run build`: Build the extension for production (outputs to `.output/chrome-mv3`).
- `bun run zip`: Build and package the extension into a `.zip` file for distribution.

### Quality Control (Mandatory before push)

- `bun run check`: Runs the full suite (Typecheck + Lint + Format Check).
- `bun run check:fast`: Runs Lint and Format Check only.
- `bun run fix`: Automatically fixes linting (oxlint) and formatting (oxfmt) issues.
- `bun run typecheck`: Runs `tsgo` for ultra-fast native TypeScript type-checking.

---

## 📐 Development Conventions

### Architecture

- **Entrypoints:** Located in `entrypoints/`.
  - `popup/`: The main UI of the extension.
  - `content.ts`: Handles DOM access and interaction with the web page.
  - `background.ts`: Handles background tasks (minimal in this project).
- **Logic:** Shared business logic (extraction, formatting) MUST reside in `lib/` (e.g., `lib/extractor.ts`).
- **Messaging:** All messaging MUST follow the schema defined in `lib/messaging.ts`.

### Coding Standards

- **TypeScript:** Strict typing is enforced. Always check types with `bun run typecheck`.
- **Styling:** Use **Tailwind CSS v4** utility classes. Custom themes are defined in `entrypoints/popup/App.css`.
- **Linting & Formatting:**
  - Use `oxlint` for linting (blazing fast).
  - Use `oxfmt` for formatting (replaces Prettier).
- **Asynchronous Code:**
  - When working in `content.ts`, always use the `ctx` object to handle context invalidation.
  - Use `ctx.onInvalidated()` for cleaning up listeners and observers.

### Git Workflow

- **Hooks:** Husky is configured to run `lint-staged` on pre-commit and `bun run check` on pre-push.
- **Releases:** Handled by GitHub Actions. Pushing a tag `v*` or manually triggering the `Publish Extension` workflow will create a GitHub Release with the zipped build.

---

## 📁 Directory Structure

- `.github/workflows/`: CI/CD (Auto-publish to GitHub Releases).
- `.husky/`: Git hooks configuration.
- `.vscode/`: Shared VS Code settings (enables `tsgo`).
- `assets/` & `public/`: Static assets and extension icons.
- `entrypoints/`: Extension entrypoints (Popup, Content, Background).
- `lib/`: Core logic, types, and messaging schema.
- `wxt.config.ts`: Main WXT and Vite configuration.
- `tsconfig.json`: TypeScript configuration (extends WXT defaults).
