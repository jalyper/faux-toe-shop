# Faux-Toe-Shop

Browser image editor (React 19 + Vite + Fabric.js) with an optional FastAPI + MongoDB status API. README.md covers features, architecture and the backend. **This repo is public:** never commit secrets, `.env` files or `.claude/settings.local.json`.

## Status

Paused. `main` is the Vite version of the app (CRA was migrated away in PR #2). Next step if resumed: decide whether to port the WASM/WebGL refactor (below) onto `main`.

## Run

```
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build    # output in frontend/build
```

There are no automated tests on `main` (the root `tests/` folder holds only an empty `__init__.py`).

## Lockfiles

Use npm in `frontend/`; `frontend/package-lock.json` is the real lockfile. The root `yarn.lock` is a leftover from the original scaffold: an empty Yarn v1 header with no root `package.json` beside it. It can be deleted when convenient.

## Archived WASM/WebGL refactor (not on main)

An unfinished refactor from April 2026 (Rust `wasm-core/` filters compiled to WebAssembly, a TypeScript `frontend/src/engine/` with a WebGL renderer, binary state and history managers, Vitest tests) was never committed. It is preserved in two tags:

- `archive/stash-2026-04-13`: the complete refactor (tracked-file edits plus untracked files from that stash). Its parent `a214f24` is the pre-cleanup CRA-era tree (before PRs #1 and #2), and the stash carries its own, separate CRA-to-Vite migration. `wasm-core/target/` build output was left out.
- `archive/wip/uncommitted-2026-04-13`: only the refactor's new files (55 of them, no edits to existing files), as they sat untracked on top of the current `main`. It lacks the edits to existing files (`Canvas.jsx`, `PhotoshopEditor.jsx`, `package.json` and others) that the stash tag holds.

Because the refactor sits on a different Vite migration than `main`, resuming it means porting it onto `main` file by file, not checking out a tag. If `wasm-core/` comes back, add `wasm-core/target/` (and `wasm-core/pkg/`) to `.gitignore` first.

<!-- cloud-sync:start -->
## The remote is the source of truth

- GitHub (`origin`) holds the truth. Local work may replace it only when it was made on top of its latest.
- Fetch before changing anything. If this copy is behind, bring it up to date first (fast-forward, or rebase your own commits onto origin). Never force-push, and never overwrite a remote change you have not seen.
- If the remote moved and the work cannot be brought on top of it cleanly, stop and ask.
- Push what you commit as soon as it is ready (in a cloud session: to your working branch).
<!-- cloud-sync:end -->
