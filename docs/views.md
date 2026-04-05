# Views

PennyWallet has three views. The **Finance Overview** can be opened from the ribbon icon; the other two views are accessible from the header buttons inside Finance Overview, or via the Command Palette.

---

## Finance Overview

The main dashboard. Open it by clicking the **PennyWallet icon** in the left ribbon, or run **PennyWallet: Open Finance Overview** from the Command Palette.

The header also contains two navigation buttons:
- **Transactions** — switch to the Transactions list view
- **Asset Statistics** — switch to the trend charts view
- **+ Add Transaction** — open the transaction form

### Month Navigation

Use `‹` / `›` to move between months. Future months are disabled.

### Summary Metrics

| Metric | Description |
|--------|-------------|
| Income | Total income recorded this month |
| Expense | Total expenses recorded this month |
| Balance | Income minus Expense for this month |

### Account Balances

Shows the **current running balance** of every active account, calculated from all transactions since the initial balance was set — not just the current month.

Credit card balances are shown as negative values (outstanding debt).

**Net Assets** at the bottom is the sum of all cash/bank balances minus all credit card debt.

### Category Pie Charts

Two pie charts appear if there is data:
- **Expense by Category** — breakdown of this month's spending
- **Income by Category** — breakdown of this month's income

Hover over a slice or legend item to highlight it.

---

## Transactions

A full list of all transactions for the selected month, with filters and subtotals.

### Filters

- **Type pills** — filter by All / Expense / Income / Transfer / Repayment
- **Category dropdown** — appears when the filtered list contains categorised transactions

### Transaction Rows

Each row shows: date, type badge, category, note, account (or From → To for transfers), and amount.

Click **✏** to edit or **🗑** to delete. A confirmation dialog appears before deletion.

### Subtotals

The bottom of the list shows **Income Subtotal** and **Expense Subtotal** for the currently filtered transactions.

---

## Asset Statistics

A longer-term view of your financial trends. To open it, click the **Asset Statistics** button in the top-right corner of the Finance Overview header.

> There is no dedicated Command Palette command for Asset Statistics — open Finance Overview first (`PennyWallet: Open Finance Overview`), then click **Asset Statistics**.

### Range Selector

Choose **3 months**, **6 months**, or **12 months**.

### Monthly Income & Expense Chart

A bar chart showing income (green, upward) and expense (orange, downward) for each month side by side. Hover a column to see exact figures in a tooltip.

### Net Asset Trend Chart

A line chart showing your net asset at the end of each month. Hover near a data point to see the value. Missing months (no data) create a gap in the line.

### Summary Metrics

| Metric | Description |
|--------|-------------|
| Avg Monthly Income | Average income across months that have any data |
| Avg Monthly Expense | Average expense across months that have any data |
| Net Asset Change | Change in net asset from first to last data point in the range |
