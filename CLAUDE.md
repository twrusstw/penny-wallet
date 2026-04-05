# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Single dev build + copy to demo-vault
npm run dev:watch    # Watch mode (rebuilds + copies on change)

# Build & Lint
npm run build        # Production build (minified)
npm run lint         # ESLint + tsc type check (no emit)
npm run lint:fix     # Auto-fix ESLint + type check

# Tests
npm run test         # Run all tests once
npm run test:watch   # Watch mode
npm run test:coverage

# Documentation
npm run docs:dev     # VitePress dev server
npm run docs:build

# Utilities
npm run dev:clean           # Remove dev artifacts
npm run demo:data           # Generate demo transaction data in demo-vault
```

To run a single test file: `npx vitest run src/tests/path/to/file.test.ts`

## Architecture

**Penny Wallet** is an Obsidian plugin for personal finance tracking. It bundles to a single `main.js` with esbuild.

### Data Layer

`src/io/WalletFile.ts` is the central I/O module. It handles:
- Reading/writing `.penny-wallet.json` (config: wallets, categories, app settings) at vault root
- Monthly transaction files at `PennyWallet/YYYY-MM.md` — each file has YAML frontmatter cache (`income`, `expense`, `netAsset`) and a markdown table of transactions
- Wallet balance calculations aggregated across all months

Transaction data never leaves the local vault — no network calls.

### Views

Three Obsidian `ItemView` implementations in `src/view/`:
- `DashboardView` — monthly income/expense/net asset overview
- `DetailView` — filterable transaction list with inline edit/delete
- `TrendView` — 3/6/12-month asset trend charts

### Modals & Settings

- `TransactionModal` (`src/modal/`) — add/edit transactions; supports pre-fill via URI
- `SettingTab` (`src/settings/`) — configure wallets, categories, display preferences

### Key Types

All core types are in `src/types.ts`: `Transaction`, `Wallet`, `WalletConfig`, `Category`. Transaction types: `expense | income | transfer | repayment`. Account types: `cash | bank | creditCard`.

### i18n

`src/i18n.ts` provides bilingual support (English + Traditional Chinese). Use `t('key')` for singular and `tn('key', n)` for plurals. All user-visible strings must be translated.

### Plugin Entry Point

`src/main.ts` extends Obsidian's `Plugin` class, registers views, the URI handler (`obsidian://penny-wallet?type=...`), and the settings tab.

## Dev Workflow

- **Demo vault**: `demo-vault/` is a local Obsidian vault used for development. `npm run dev` / `dev:watch` auto-copies `main.js`, `manifest.json`, and `styles.css` into `demo-vault/.obsidian/plugins/penny-wallet/`.
- **Tests**: Vitest runs in Node environment. Coverage targets core logic only — views, modals, and settings are excluded from coverage requirements (they depend on Obsidian APIs).
- **External modules**: `obsidian`, `electron`, CodeMirror/Lezer packages, and Node builtins are excluded from the bundle (provided by Obsidian at runtime).
