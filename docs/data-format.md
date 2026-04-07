# Data Format

PennyWallet stores all data as plain text files in your vault. No proprietary database, no binary files.

---

## File Structure

```
<vault>/
├── .penny-wallet.json       ← plugin config
└── PennyWallet/             ← monthly transaction files (folder name configurable)
    ├── 2026-04.md
    ├── 2026-03.md
    └── 2026-02.md
```

---

## Monthly Transaction Files

Each file covers one calendar month and contains two parts: a **frontmatter cache** and a **Markdown table**.

### Example: `2026-04.md`

```markdown
---
income: 72000
expense: 18450
netAsset: 0
---

## 2026-04

| Date  | Type      | Wallet        | From         | To            | Category | Note      | Amount | CreatedAt                |
|-------|-----------|---------------|--------------|---------------|----------|-----------|--------|---------------------------|
| 04/15 | income    | HSBC Savings  | -            | -             | salary   | April pay | 72000  | 2026-04-15T08:12:00.000Z |
| 04/12 | expense   | Visa Platinum | -            | -             | shopping | Groceries | 1200   | 2026-04-12T14:30:00.000Z |
| 04/10 | expense   | Cash          | -            | -             | food     | Lunch     | 280    | 2026-04-10T12:05:00.000Z |
| 04/05 | transfer  | -             | HSBC Savings | Cash          | -        | ATM       | 8000   | 2026-04-05T09:00:00.000Z |
| 04/28 | repayment | -             | HSBC Savings | Visa Platinum | -        | Card bill | 5000   | 2026-04-28T10:00:00.000Z |
```

### Column Reference

| Column | expense / income | transfer / repayment |
|--------|-----------------|----------------------|
| Date | `MM/DD` | `MM/DD` |
| Type | `expense` / `income` | `transfer` / `repayment` |
| Wallet | account name | `-` |
| From | `-` | source account |
| To | `-` | destination account |
| Category | category key or custom name | `-` |
| Note | optional text | optional text |
| Amount | positive number | positive number |
| CreatedAt | ISO 8601 UTC timestamp | ISO 8601 UTC timestamp |

### Frontmatter Cache

The `income`, `expense`, and `netAsset` fields at the top are a cache used for fast loading in the Finance Overview and Finance Trends views. They are recomputed automatically whenever a transaction is added, edited, or deleted.

> Do not edit the frontmatter manually — it will be overwritten on the next transaction write.

---

## Config File: `.penny-wallet.json`

Stored at the **vault root** (not inside the transactions folder).

```json
{
  "wallets": [
    {
      "name": "Cash",
      "type": "cash",
      "initialBalance": 5000,
      "status": "active",
      "includeInNetAsset": true
    },
    {
      "name": "Visa Platinum",
      "type": "creditCard",
      "initialBalance": 2000,
      "status": "active",
      "includeInNetAsset": true
    }
  ],
  "defaultWallet": "Cash",
  "folderName": "PennyWallet",
  "decimalPlaces": 0,
  "options": {
    "types": { "default": ["expense", "income", "transfer", "repayment"], "custom": [] },
    "categories": {
      "expense": { "default": ["food", "transport", "shopping", "entertainment", "medical", "housing", "other"], "custom": ["Coffee"] },
      "income":  { "default": ["salary", "bonus", "side_income", "other"], "custom": [] }
    }
  }
}
```

---

## Git Sync Compatibility

The plain Markdown format works seamlessly with Obsidian Git or any other sync plugin:

- Each month is a separate file → minimal merge conflicts
- The config file changes only when you update settings or accounts
- Binary files: none

---

## Dataview Compatibility

Since transactions are stored as Markdown tables, you can query them with [Dataview](https://github.com/blacksmithgu/obsidian-dataview).

Dataview reads frontmatter fields directly. You can use it to query the monthly summary values stored at the top of each file:

**Example — list monthly income and expense across all months:**

```dataview
TABLE income, expense, (income - expense) AS balance
FROM "PennyWallet"
WHERE income != null
SORT file.name ASC
```

**Example — find months where expenses exceeded income:**

```dataview
LIST file.name
FROM "PennyWallet"
WHERE expense > income
```

> Note: Dataview reads the **frontmatter cache** (income/expense totals per month), not individual transaction rows. For per-transaction queries, the Markdown table format is not natively supported by Dataview — use the raw file or a custom DataviewJS script.

---

## Manual Editing

You can edit the Markdown files directly in Obsidian. Follow the column format exactly:
- Dates must be `MM/DD`
- Use `-` for unused columns (not empty)
- Amount must be a plain number (no currency symbols or commas)
- `CreatedAt` is auto-assigned when writing through the UI — do not edit it manually, as it is used for stable same-date ordering

After manual edits, PennyWallet will re-read the file on the next view render. The frontmatter cache will be updated automatically on the next transaction write to that month.
