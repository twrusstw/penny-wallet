# Testing Guide

This page covers the automated test strategy for PennyWallet, how to set up the test environment, and which areas are covered.

---

## Overview

PennyWallet uses **[Vitest](https://vitest.dev/)** as its test runner. Vitest was chosen because:

- Native ESM and TypeScript support (no extra transform config needed)
- Compatible with the project's `ES2018` / `lib: ES2017` target
- Fast HMR-based watch mode
- Built-in coverage via `@vitest/coverage-v8`

---

## Test Pyramid

```
         /  UI Integration  \   Obsidian CLI drives live demo-vault (npm run test:ui)
        /    Integration     \  Obsidian API mocked: file I/O paths, config CRUD
       /      Unit Tests      \ Pure functions: parsing, business logic, helpers
```

The bulk of automated coverage targets **pure functions** in `WalletFile.ts`, `utils.ts`, and `types.ts`. These require **zero mocking** and run in milliseconds. UI behaviour (views, modals, settings) is covered by the `test:ui` suite which drives a real Obsidian instance via CLI.

---

## Directory Layout

```
penny-wallet/
├── src/
│   └── ...
├── tests/
│   ├── setup.ts               ← global Vitest setup (Obsidian mock stubs)
│   ├── helpers/
│   │   └── mockApp.ts         ← in-memory Obsidian vault mock
│   ├── unit/
│   │   ├── parsing.test.ts    ← parseRow, formatRow, parseFrontmatter, buildMonthContent
│   │   ├── business.test.ts   ← computeWalletBalances, computeNetAsset, computeSummary
│   │   └── utils.test.ts      ← formatAmount, stepMonth, dateToYearMonth, …
│   └── integration/
│       ├── walletFile.test.ts ← readMonth, writeTransaction, updateTransaction with mock vault
│       └── config.test.ts     ← loadConfig, saveConfig
└── vitest.config.ts
```

---

## Setup

### Install

```bash
npm install --save-dev vitest @vitest/coverage-v8
```

### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/view/**', 'src/modal/**', 'src/settings/**'],
    },
  },
})
```

> Views, modals, and settings are excluded from automated coverage because they depend on the full Obsidian DOM. Test those manually with the demo vault.

### `tests/setup.ts` — Obsidian API stubs

```ts
import { vi } from 'vitest'

class TFile {
  path: string = ''
  basename: string = ''
  constructor(path: string = '') {
    this.path = path
    this.basename = path ? path.split('/').pop()!.replace(/\.md$/, '') : ''
  }
}

vi.mock('obsidian', () => ({
  normalizePath: (p: string) => p.replace(/\\/g, '/'),
  TFile,
  App: class App {},
  Modal: class Modal {
    app: unknown
    contentEl = { empty: vi.fn(), createEl: vi.fn(), createDiv: vi.fn(), addClass: vi.fn() }
    constructor(app: unknown) { this.app = app }
    open() {} close() {}
  },
  Notice: class Notice { constructor(_: string) {} },
  Plugin: class Plugin {},
}))

// window.moment stub (used by getLocaleCashName)
Object.defineProperty(global, 'window', {
  value: { moment: { locale: () => 'en' } },
  writable: true,
})
```

> `TFile` needs to be declared as a full class with `path`/`basename` fields. `mockApp.ts` uses `Object.assign(new TFile(), { path, basename })` to create instances, ensuring `instanceof TFile` works correctly between production code and test helpers.

### `package.json` scripts

```json
"test":          "vitest run",
"test:watch":    "vitest",
"test:coverage": "vitest run --coverage",
"test:ui":       "node scripts/test-ui.mjs",
"demo:reset":    "git clean -fdx demo-vault/ && git restore demo-vault/ && node esbuild.config.mjs development && node scripts/generate-demo-data.mjs"
```

---

## Unit Tests: Pure Functions

### 1. Markdown Parsing (`tests/unit/parsing.test.ts`)

These functions are **pure** (no I/O, no Obsidian API):

| Function | What to assert |
|----------|---------------|
| `parseRow` | Valid row → correct Transaction object |
| `parseRow` | `payment` type → normalised to `repayment` (backward compat) |
| `parseRow` | `-` fields → `undefined` in result |
| `parseRow` | Less than 8 columns → `null` |
| `parseRow` | Non-numeric amount → `null` |
| `formatRow` | Round-trips with `parseRow` (format → parse → same object) |
| `parseMonthFile` | Full file content with frontmatter → transactions only |
| `parseMonthFile` | Chinese header (`| 日期`) → correctly parsed |
| `parseMonthFile` | Multiple tables in one file → only parses the first contiguous table |
| `parseFrontmatter` | Valid frontmatter → `{ income, expense, netAsset }` |
| `parseFrontmatter` | Missing frontmatter → `{}` |
| `buildMonthContent` | Produces frontmatter + heading + header row |
| `buildMonthContent` | Empty transaction list → header row only, no data rows |
| `dateToYearMonth` | `"2026-04-03"` → `"2026-04"` |
| `dateToMonthDay` | `"2026-04-03"` → `"04/03"` |

### 2. Business Logic (`tests/unit/business.test.ts`)

`computeWalletBalances` — takes a list of transactions and a config, returns balances.

| Scenario | Expected result |
|----------|----------------|
| expense on bank → balance decreases | `initialBalance - amount` |
| expense on creditCard → debt increases | `initialBalance + amount` |
| income on bank → balance increases | `initialBalance + amount` |
| transfer → fromWallet decreases, toWallet increases | both correct |
| repayment → bank decreases, creditCard debt decreases | both correct |
| wallet not in config → silently ignored | no crash |
| wallet order → always cash → bank → creditCard | sort verified |

`computeNetAsset`

| Scenario | Expected |
|----------|---------|
| no credit card | `Σ(cash + bank)` |
| with credit card | `Σ(cash + bank) - creditDebt` |
| archived wallet with `includeInNetAsset: false` | excluded from sum |
| archived wallet with `includeInNetAsset: true` | included |

`computeSummary`

| Scenario | Expected |
|----------|---------|
| only expenses | `income: 0, expense: Σ` |
| only income | `income: Σ, expense: 0` |
| transfer/repayment excluded | not counted in either |
| `netAsset` always 0 | (frontmatter cache only) |

`groupByCategory`

| Scenario | Expected |
|----------|---------|
| multiple same category | summed correctly |
| missing category → falls back to `'other'` | `other` key gets the amount |
| type filter works | income transactions excluded from `expense` grouping |

### 3. Utils (`tests/unit/utils.test.ts`)

| Function | Cases |
|----------|-------|
| `formatAmount(1234, 0)` | Contains "1234" (thousands separator varies by locale) |
| `formatAmount(1234.5, 2)` | Ends with ".50" |
| `stepMonth("2026-01", 1)` | `"2026-02"` |
| `stepMonth("2026-12", 1)` | `"2027-01"` (year rollover) |
| `stepMonth("2026-01", -1)` | `"2025-12"` (year rollback) |
| `isAfterCurrentMonth` | future month → `true`; current → `false`; past → `false` |
| `dateToYearMonth` | substring to 7 chars |
| `dateToMonthDay` | `MM/DD` format |

---

## Integration Tests: Vault I/O with Mocked `App`

These require a `MockApp` helper that simulates an in-memory Obsidian vault.

### MockApp helper (`tests/helpers/mockApp.ts`)

```ts
import { TFile } from 'obsidian'

export function createMockApp(initialFiles: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initialFiles))

  const makeTFile = (path: string) => Object.assign(new TFile(), {
    path,
    basename: path.split('/').pop()!.replace(/\.md$/, ''),
  })

  const vault = {
    getAbstractFileByPath: (path: string) => store.has(path) ? makeTFile(path) : null,
    getFileByPath: (path: string) => store.has(path) ? makeTFile(path) : null,
    getFolderByPath: (path: string) => {
      const hasChildren = [...store.keys()].some(p => p.startsWith(path + '/'))
      return hasChildren ? { path } : null
    },
    getMarkdownFiles: () => [...store.keys()].filter(p => p.endsWith('.md')).map(p => makeTFile(p)),
    read: async (file: InstanceType<typeof TFile>) => store.get(file.path) ?? '',
    modify: async (file: InstanceType<typeof TFile>, content: string) => { store.set(file.path, content) },
    create: async (path: string, content: string) => {
      if (store.has(path)) throw new Error(`File already exists: ${path}`)
      store.set(path, content)
      return makeTFile(path)
    },
    createFolder: async () => {},
    adapter: {
      exists: async (path: string) => store.has(path),
      read: async (path: string) => store.get(path) ?? '',
      write: async (path: string, content: string) => { store.set(path, content) },
      remove: async (path: string) => { store.delete(path) },
    },
  }

  return { app: { vault } as any, store }
}
```

`store` is exposed directly for assertions — no need to re-read through the API. `Object.assign(new TFile(), {...})` ensures `instanceof TFile` works correctly because TFile's TypeScript types don't expose constructor parameters.

### Config I/O (`tests/integration/config.test.ts`)

| Scenario | Expected |
|----------|---------|
| No config file on disk (first launch) | creates `.penny-wallet.json` with locale cash name |
| Config at `.penny-wallet.json` | loads and returns it |
| Malformed JSON | falls back to `DEFAULT_CONFIG` |
| `saveConfig` after `updateConfig` | persists patch to in-memory vault |
| `getConfig` after `updateConfig` | returns latest in-memory value |

### Transaction CRUD (`tests/integration/walletFile.test.ts`)

| Scenario | Expected |
|----------|---------|
| `writeTransaction` on empty month | creates month file, 1 row |
| `writeTransaction` — sort order | newer dates appear first in file |
| `writeTransaction` — frontmatter updated | `income` / `expense` match sum |
| `updateTransaction` same month | replaces row in-place |
| `updateTransaction` cross-month | deletes from old month, inserts in new |
| `deleteTransaction` last row | file still exists with empty table body |
| `readMonth` with no file | returns `[]` |
| `calculateWalletData` | `walletsWithTransactions` contains used wallet names |
| `getNetAssetTimeline` incremental | net asset at each month equals manual calculation |
| `getWalletBalanceTrend` — cross-month | cash/bank balances accumulate correctly; credit cards excluded; empty map when no data |
| `getCategoryTrend` | per-month category sum; returns 0 when no matching transactions |
| `walletHasTransactions` | matches wallet, fromWallet, toWallet; returns false when unused |
| `getMonthSummaries` | returns summary for months with files; skips missing months |
| `getLocaleCashName` | zh locale → Chinese wallet name |

---

## UI Integration Tests (`npm run test:ui`)

`scripts/test-ui.mjs` drives a live Obsidian instance using the [Obsidian CLI](https://github.com/obsidianmd/obsidian-api) (`obsidian vault="demo-vault" ...`). It is **not** a unit test — Obsidian must be running with `demo-vault` open.

### Prerequisites

1. Obsidian **1.7.4 or later** (the CLI is not available in older versions)
2. Obsidian is open with `demo-vault`
3. Plugin is built: `npm run dev`
4. Demo data populated: `npm run demo:data` (or full reset: `npm run demo:reset`)

### What it covers (50 checks)

| Section | What's tested |
|---------|--------------|
| Plugin health | Plugin reloads without error |
| Finance Overview — layout | Month label, nav buttons, metrics, wallet list |
| Finance Overview — navigation | Prev/next month buttons, disabled state |
| Finance Overview — pie charts | Chart renders, legend items |
| Add Transaction modal | Modal opens, type tabs present |
| Add expense transaction | Full form submit: wallet selected, amount filled, modal closes |
| Finance Trends view | View opens, range selector, canvas renders |
| Transactions (Detail) view | View opens, filter pills, rows rendered, expense filter |
| Edit transaction | Edit modal opens, pre-fills data, submit closes modal, row count unchanged |
| Delete transaction — cancel | Confirm dialog appears, cancel keeps row count |
| Delete transaction — confirm | Row count decreases by 1 |
| Credit card balance direction | Credit card badge rows present |
| Settings tab | Tab opens, folder/decimal settings visible |
| Account — add new wallet | New wallet appears in list |
| Account — edit wallet | Edit modal opens with correct fields |
| Account — delete wallet | Confirm dialog, wallet removed from config |
| Account — archive and restore | Archive sets status, restore reverts it |
| URI handler | Modal opens with pre-filled amount |

### Locale-agnostic selectors

All buttons are selected by `data-action` attribute (not translated text):

```js
[data-action="confirm"]     // confirm button in any modal
[data-action="cancel"]      // cancel button
[data-action="edit"]        // edit transaction
[data-action="delete"]      // delete transaction / wallet
[data-action="archive"]     // archive wallet
[data-action="unarchive"]   // restore wallet
.pw-type-tab[data-type=expense]  // transaction type tab
```

### Resetting the demo vault

If tests leave the vault in a dirty state:

```bash
npm run demo:reset
```

This removes all generated files (`git clean -fdx demo-vault/`), rebuilds the plugin, and regenerates 12 months of demo data.

---

## Manual Test Checklist

See [Developer Guide → Manual Test Checklist](./developer-guide#manual-test-checklist) for the full pre-release checklist using the demo vault.

---

## Coverage Targets

| Area | Target |
|------|--------|
| `src/io/WalletFile.ts` (pure methods) | ≥ 90% |
| `src/utils.ts` | 100% |
| `src/types.ts` (migration helpers) | 100% |
| View / Modal / Settings (UI) | `npm run test:ui` (50 checks, requires Obsidian running) |

Run coverage:

```bash
npm run test:coverage
```

HTML report is written to `coverage/` (gitignored).
