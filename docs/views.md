# Views

PennyWallet has three views. The **Finance Overview** can be opened from the ribbon icon; the other two views are accessible from the header buttons inside Finance Overview, or via the Command Palette.

---

## Finance Overview

The main dashboard. Open it by clicking the **PennyWallet icon** in the left ribbon, or run **PennyWallet: Open Finance Overview** from the Command Palette.

The header also contains two navigation buttons:
- **Transactions** — switch to the Transactions list view
- **Finance Trends** — switch to the trend charts view
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

### Asset Allocation Pie

Appears when you have two or more active cash/bank accounts with positive balances. Shows how your liquid assets are distributed across accounts. Each legend entry shows the account name, balance amount, and percentage.

### Category Pie Charts

Two pie charts appear if there is data:
- **Expense by Category** — breakdown of this month's spending
- **Income by Category** — breakdown of this month's income

Each legend entry shows the category name, amount, and percentage. Hover over a slice or legend item to highlight it.

---

## Transactions

A full list of all transactions for the selected month, with filters and subtotals.

### Filters

- **Type pills** — multi-select: All / Expense / Income / Transfer / Repayment (tap multiple to combine)
- **Category dropdown** — checklist of categories present in the filtered results; select any combination to narrow further
- **Keyword search** — filters transactions whose note contains the search text

### Transaction Rows

Each row shows: date, type badge, category, note, account (or From → To for transfers), and amount.

Click **✏** to edit or **🗑** to delete. A confirmation dialog appears before deletion.

### Subtotals

A fixed bar at the bottom always shows **Expense Subtotal** and **Income Subtotal** for the currently filtered transactions. The list scrolls independently without affecting the header or subtotals.

---

## Finance Trends

A longer-term view of your financial trends. To open it, click the **Finance Trends** button in the top-right corner of the Finance Overview header.

> There is no dedicated Command Palette command for Finance Trends — open Finance Overview first (`PennyWallet: Open Finance Overview`), then click **Finance Trends**.

### Range Selector

Choose **3 months**, **6 months**, or **12 months**.

### Monthly Income & Expense Chart

A bar chart showing income (green, upward) and expense (orange, downward) for each month side by side. Hover a column to see exact figures in a tooltip.

### Category Trend Chart

A line chart showing monthly totals for a single category. Use the dropdown to switch categories — the chart updates without resetting the page. The total for the selected range is shown below the chart.

### Net Asset Trend Chart

A line chart showing your net asset at the end of each month. Hover near a data point to see the value. Missing months (no data) create a gap in the line.

### Account Balance Trend Chart

A multi-line chart showing the running balance of each active cash/bank account over the selected range. Hover to see per-account values in a tooltip. Only appears when you have two or more such accounts.

### Summary Metrics

| Metric | Description |
|--------|-------------|
| Avg Monthly Income | Average income across months that have any data |
| Avg Monthly Expense | Average expense across months that have any data |
| Net Asset Change | Change in net asset from first to last data point in the range |
