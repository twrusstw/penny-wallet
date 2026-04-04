# PennyWallet

A personal finance tracker for Obsidian. Log expenses, income, transfers, and credit card repayments — all stored as plain Markdown tables in your vault.

<!-- screenshot: dashboard overview -->

## Features

- **Overview** — monthly income / expense summary, account balances, net asset, and category pie charts
- **Records** — filterable transaction list with inline edit and delete
- **Statistics** — 3 / 6 / 12-month bar and line charts
- **Multiple accounts** — cash, bank account, credit card
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

1. Enable PennyWallet — a balloon icon appears in the left ribbon
2. Go to **Settings → PennyWallet** to add your accounts (cash, bank, credit card) with initial balances
3. Click the ribbon icon or run **Add Transaction** from the Command Palette to log your first transaction

<!-- screenshot: settings accounts -->

<!-- screenshot: transaction modal -->

## URI Handler

PennyWallet registers the `obsidian://penny-wallet` URI scheme, allowing external apps — including iOS Shortcuts, Android automation tools, or any app that can open URLs — to interact with the plugin without manual input.

Two actions are supported:

- **Open modal** (default) — open the transaction form with fields pre-filled
- **Query lists** (`cmd=list`) — copy available accounts or categories to the clipboard

See [docs/ios-shortcuts.md](docs/ios-shortcuts.md) for step-by-step iOS Shortcuts setup.

<!-- screenshot: iOS shortcut example -->

## Data Format

Transactions are stored as Markdown tables — one file per month:

```
<vault>/
├── .penny-wallet.json   ← config + available options (accounts, categories)
└── PennyWallet/
    ├── 2026-04.md
    └── 2026-03.md
```

Each month file has a frontmatter cache (`income`, `expense`, `netAsset`) for fast Overview loading, and a plain Markdown table of transactions. Compatible with Git sync and Dataview queries.

<!-- screenshot: raw markdown file -->

## Views

<!-- screenshot: records view -->

<!-- screenshot: statistics view -->
