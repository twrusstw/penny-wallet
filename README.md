# PennyWallet

A personal finance tracker for Obsidian. Log expenses, income, transfers, and credit card repayments — all stored as plain Markdown tables in your vault.

<!-- screenshot: dashboard overview -->

## Features

- **Dashboard** — monthly income / expense summary, wallet balances, net asset, and category pie charts
- **Detail view** — filterable transaction list with inline edit and delete
- **Trend view** — 3 / 6 / 12-month bar and line charts
- **Multiple wallets** — cash, bank account, credit card
- **iOS Shortcuts** — add transactions via URI without opening Obsidian
- **Bilingual** — English and Traditional Chinese (follows Obsidian language setting)

## Installation

### Community Plugin Store (recommended)
Search **PennyWallet** in Obsidian → Community Plugins.

### Manual
1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/twrusstw/penny-wallet/releases/latest)
2. Copy them to `<vault>/.obsidian/plugins/penny-wallet/`
3. Enable the plugin in Obsidian Settings → Community Plugins

## Getting Started

1. Enable PennyWallet — a wallet icon appears in the left ribbon
2. Go to **Settings → PennyWallet** to add your wallets (cash, bank, credit card) with initial balances
3. Click the ribbon icon or run **Add Transaction** from the Command Palette to log your first transaction

<!-- screenshot: settings wallets -->

<!-- screenshot: transaction modal -->

## iOS Shortcuts

Trigger the transaction modal pre-filled from an iOS Shortcut:

```
obsidian://penny-wallet?type=expense&amount=250&note=Lunch&category=food&wallet=Cash&date=2026-04-03
```

All parameters except `amount` are optional. Omitted fields use defaults (today's date, default wallet, expense type).

<!-- screenshot: iOS shortcut example -->

## Data Format

Transactions are stored as Markdown tables — one file per month:

```
ledgers/
├── 2026-04.md
├── 2026-03.md
└── .penny-wallet.json
```

Each file has a frontmatter cache (`income`, `expense`, `netAsset`) for fast Dashboard loading, and a plain Markdown table of transactions. Compatible with Git sync and Dataview queries.

<!-- screenshot: raw markdown file -->

## Views

<!-- screenshot: detail view -->

<!-- screenshot: trend view -->
