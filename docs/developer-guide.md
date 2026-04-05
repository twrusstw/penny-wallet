# Developer Guide

This page covers how to set up a local development environment, contribute changes, and submit a pull request.

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Obsidian](https://obsidian.md/) desktop app (for live testing)
- Git

---

## Repository Structure

```
penny-wallet/
├── src/
│   ├── main.ts                  ← plugin entry point
│   ├── types.ts                 ← shared types and constants
│   ├── i18n.ts                  ← translations (zh-TW, en)
│   ├── utils.ts                 ← shared view helpers
│   ├── io/
│   │   └── WalletFile.ts        ← all file I/O and business logic
│   ├── modal/
│   │   ├── TransactionModal.ts  ← add/edit transaction form
│   │   └── ConfirmModal.ts      ← shared confirmation dialog
│   ├── view/
│   │   ├── DashboardView.ts     ← Finance Overview
│   │   ├── DetailView.ts        ← Transactions list
│   │   └── TrendView.ts         ← Finance Trends charts
│   └── settings/
│       └── SettingTab.ts        ← plugin settings UI
├── scripts/
│   ├── dev-clean.mjs            ← reset demo vault plugin + restart watch
│   └── generate-demo-data.mjs  ← seed demo vault with realistic data
├── demo-vault/                  ← local Obsidian vault for development
├── esbuild.config.mjs           ← build configuration
├── manifest.json                ← Obsidian plugin manifest
└── styles.css                   ← all plugin styles
```

---

## Setup

Fork the repository, then clone your fork:

```bash
git clone https://github.com/<your-username>/penny-wallet.git
cd penny-wallet
npm install
```

---

## Development Workflow

### 1. Start the watch build

```bash
npm run dev:watch
```

This runs esbuild in watch mode. On every file save:
1. TypeScript is compiled and bundled to `main.js`
2. `main.js`, `manifest.json`, and `styles.css` are automatically copied to `demo-vault/.obsidian/plugins/penny-wallet/`

### 2. Open the demo vault in Obsidian

In Obsidian, open the `demo-vault/` folder as a vault. The PennyWallet plugin is pre-configured there.

Enable the plugin if not already: **Settings → Community Plugins → PennyWallet → Enable**

> **Hot reload:** After each build, use the Obsidian command **Reload app without saving**.

### 3. Reset and reseed

If the demo vault state gets messy:

```bash
npm run dev:clean
```

This removes the plugin folder from the demo vault and restarts the watch build from a clean state.

To regenerate demo transaction data:

```bash
npm run demo:data
```

This runs `scripts/generate-demo-data.mjs`, which creates 12 months of realistic dummy transactions with multiple account types. The seed is fixed (`20260403`) so output is deterministic.

---

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev:watch` | Watch mode — rebuild on save, sync to demo vault |
| `npm run dev` | Single development build (with inline sourcemap) |
| `npm run dev:clean` | Clean demo vault plugin folder + restart watch |
| `npm run build` | Production build (minified, no sourcemap) |
| `npm run demo:data` | Seed demo vault with 12 months of dummy data |
| `npm run lint` | ESLint + TypeScript type-check |
| `npm run lint:fix` | ESLint autofix + type-check |

---

## Type Checking

Run the TypeScript compiler in check-only mode (no emit):

```bash
npm run lint
```

Or just the type-checker:

```bash
npx tsc --noEmit
```

The project targets **ES2018** with `lib: ["ES2017", "DOM"]`. Avoid using APIs not in those libs (e.g. `Array.flat()` — use a loop instead).

---

## Linting

ESLint is configured via `eslint.config.mjs`. Rules are inherited from `typescript-eslint` recommended defaults.

```bash
# Check only
npm run lint

# Autofix (safe fixes only)
npm run lint:fix
```

---

## Testing

Run the automated test suite with:

```bash
npm test
```

Tests are written with [Vitest](https://vitest.dev/) and live in `tests/`. See the [Testing](./testing) page for coverage details.

### Manual Test Checklist {#manual-test-checklist}

Before opening a PR, verify the following:

**Transactions**
- [ ] Add expense / income / transfer / repayment — all save correctly
- [ ] Edit a transaction in the same month
- [ ] Edit a transaction changing its date to a different month (cross-month move)
- [ ] Delete a transaction — confirm dialog appears, balance updates

**Accounts**
- [ ] Add cash / bank / credit card account
- [ ] Edit account name and initial balance — balances recalculate
- [ ] Archive an account with transactions — disappears from modal, stays in history
- [ ] Unarchive an account — reappears in transaction form
- [ ] Delete an account with no transactions

**Credit Card**
- [ ] Record expense on credit card — debt increases
- [ ] Record repayment from bank to credit card — both balances update
- [ ] Net asset reflects credit card debt as negative

**Finance Overview**
- [ ] Correct month navigation (prev/next, future disabled)
- [ ] Income / expense / balance metrics are correct
- [ ] Account balances match expected values
- [ ] Pie charts render with correct proportions and hover highlight

**Transactions View**
- [ ] Type filter pills work
- [ ] Category dropdown appears and filters correctly
- [ ] Subtotals match filtered transactions

**Finance Trends**
- [ ] 3 / 6 / 12-month range selector switches data
- [ ] Bar chart and line chart render without errors
- [ ] Tooltip shows on hover

**Settings**
- [ ] Folder name change persists
- [ ] Default account change applies to new transaction modal
- [ ] Decimal places switch: new transactions accept decimals / integers correctly
- [ ] Custom categories: add, duplicate check, remove

**Mobile**
- [ ] Transaction modal shifts up when keyboard opens (iOS)
- [ ] Enter key on note/amount blurs the field (iOS)
- [ ] All three views scroll and interact correctly

---

## Code Conventions

### File organisation
- Business logic and file I/O live exclusively in `src/io/WalletFile.ts`
- UI rendering is split by view — each view file is self-contained
- Shared utilities go in `src/utils.ts`; shared modal components in `src/modal/`

### i18n
- All user-facing strings must use `t('key')` from `src/i18n.ts`
- Add keys to **both** `zh-TW` and `en` blocks
- Category keys (e.g. `food`) are translated via `translateCategory()`, not `t()`

### Styling
- All CSS classes are prefixed with `.pw-` to avoid Obsidian namespace collisions
- Use Obsidian CSS variables (`--text-muted`, `--interactive-accent`, etc.) for theme compatibility
- Inline styles are only acceptable for dynamically computed values (e.g. chart colours, canvas positioning)

### TypeScript
- Avoid `as any` — if you need it, add a comment explaining why
- `getConfig()` returns a direct reference to internal state — treat it as read-only; use `updateConfig()` to mutate
- New event names must follow the `penny-wallet:<event>` convention

---

## Submitting a Pull Request

1. Create a branch from `dev` (not `main`):
   ```bash
   git checkout dev
   git checkout -b feat/your-feature-name
   ```
2. Make your changes and run through the [Manual Test Checklist](#manual-test-checklist)
3. Run lint and confirm no errors:
   ```bash
   npm run lint
   ```
4. Push your branch and open a PR against the `dev` branch
5. Describe what you changed and why — include screenshots if the UI is affected

> **Note:** Releases are managed by the maintainer. PRs merged to `dev` are batched into releases; do not tag or publish releases yourself.
