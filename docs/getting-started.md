# Getting Started

## Installation

### Manual Install

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/twrusstw/penny-wallet/releases/latest)
2. Create the folder `<your-vault>/.obsidian/plugins/penny-wallet/`
3. Copy the three files into that folder
4. Open Obsidian → **Settings → Community Plugins** → enable **PennyWallet**

### Community Plugin Store

Search **PennyWallet** in **Settings → Community Plugins → Browse**, then install and enable.

---

## First-Time Setup

### Step 1 — Add your accounts

Go to **Settings → PennyWallet → Active Accounts** and click **Add Account**.

For each account you have, add an entry with:

- **Name** — any label you want (e.g. `Cash`, `HSBC Savings`, `Visa Platinum`)
- **Type** — `Cash`, `Bank`, or `Credit Card`
- **Initial Balance** — your current balance (for credit cards, enter your current outstanding debt as a positive number, e.g. `3000` means you owe 3,000)

> **Tip:** Add all accounts before logging any transactions, so balances are calculated correctly from the start.

### Step 2 — Set a default account

In **Settings → PennyWallet → General**, choose which account should be pre-selected when you open the Add Transaction form.

### Step 3 — Log your first transaction

Click the **PennyWallet icon** in the left ribbon to open the Finance Overview, then press **+ Add Transaction**.

Alternatively, use these Command Palette commands (`Cmd+P`):

| Command | Action |
|---------|--------|
| `PennyWallet: Open Finance Overview` | Open the dashboard |
| `PennyWallet: Open Transactions` | Open the transaction list |
| `PennyWallet: Open assets` | Open the assets view |
| `PennyWallet: Add Transaction` | Open the transaction form directly |
| `PennyWallet: Refresh views` | Refresh all open PennyWallet views |

Fill in:
- **Type** — Expense, Income, Transfer, or Repayment
- **Date** — defaults to today
- **Account** — which account to record against
- **Category** — choose from the list or leave blank
- **Note** — optional description
- **Amount**

Press **Confirm** to save.

---

## Where data is stored

PennyWallet creates:

```
<vault>/
├── .penny-wallet.json     ← your config (accounts, categories, settings)
└── PennyWallet/           ← one .md file per month
    ├── 2026-04.md
    └── 2026-03.md
```

The folder name (`PennyWallet` by default) can be changed in Settings. See [Data Format](./data-format) for details on the file structure.
