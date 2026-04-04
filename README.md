# PennyWallet

A personal finance tracker plugin for [Obsidian](https://obsidian.md). Log expenses, income, transfers, and credit card repayments — all stored as plain Markdown tables in your vault.

## Features

- **Finance Overview** — monthly income / expense summary, account balances, net asset, and category pie charts
- **Transactions** — filterable transaction list with inline edit and delete
- **Asset Statistics** — 3 / 6 / 12-month bar and line charts
- **Multiple account types** — cash, bank account, credit card (with debt tracking)
- **Custom categories** — add your own expense and income categories
- **iOS Shortcuts support** — add transactions via URI without opening Obsidian
- **Bilingual** — English and Traditional Chinese (follows Obsidian language setting)

## Installation

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/twrusstw/penny-wallet/releases/latest)
2. Copy them to `<vault>/.obsidian/plugins/penny-wallet/`
3. Enable the plugin in **Settings → Community Plugins**

### Community Plugin Store

Search **PennyWallet** in **Settings → Community Plugins → Browse**.

## Getting Started

1. Enable PennyWallet — a balloon icon appears in the left ribbon
2. Open **Settings → PennyWallet** and add your accounts with their current balances
3. Click the ribbon icon or run **Add Transaction** from the Command Palette to log your first entry

## Transaction Types

| Type | Description |
|------|-------------|
| **Expense** | Money out from cash / bank / credit card |
| **Income** | Money received into an account |
| **Transfer** | Move money between two accounts |
| **Repayment** | Pay off a credit card balance from a bank / cash account |

Credit card accounts track outstanding debt. Expenses increase the debt; repayments reduce it. Net asset calculation automatically subtracts credit card debt.

## Views

### Finance Overview

Monthly summary with income, expense, balance, account balances, net asset, and pie charts by category.

![Finance Overview](images/finance-overview.png)

### Transactions

Full transaction list with type and category filters, inline edit and delete, and monthly subtotals.

![Transactions](images/transactions-view.png)

### Asset Statistics

Bar chart of monthly income vs expense, line chart of net asset trend, with 3 / 6 / 12-month range selector.

![Asset Statistics](images/asset-statistics-view.png)

### Settings

Add, edit, or archive accounts. Manage custom expense and income categories.

![Settings](images/settings-accounts.png)

## Transaction Modal

![Transaction Modal](images/transaction-modal.png)

## URI Handler

PennyWallet registers the `obsidian://penny-wallet` URI scheme, allowing external apps — including iOS Shortcuts — to open the transaction form with fields pre-filled.

## Data Format

Transactions are stored as Markdown tables, one file per month:

```
<vault>/
├── .penny-wallet.json     ← config (accounts, categories, settings)
└── PennyWallet/
    ├── 2026-04.md
    └── 2026-03.md
```

![Raw Markdown](images/raw-markdown.png)

Each file has a frontmatter cache (`income`, `expense`, `netAsset`) for fast loading, and a plain Markdown table of transactions. The format is compatible with Git sync and Dataview queries.

## License

[MIT](LICENSE)
