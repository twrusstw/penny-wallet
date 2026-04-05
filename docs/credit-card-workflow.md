# Credit Card Workflow

Credit card accounts in PennyWallet track **outstanding debt**, not a traditional balance. This page explains the complete credit card cycle.

---

## How Credit Card Balances Work

| Event | Effect on Credit Card |
|-------|-----------------------|
| Add a credit card with initial balance `3000` | Starts with NT$3,000 outstanding debt |
| Record an **Expense** on the credit card | Debt increases |
| Record a **Repayment** to the credit card | Debt decreases |

The balance shown in Finance Overview is displayed as a **negative number** (e.g. `−4,500`) because it represents money you owe, and is **subtracted** from your net asset.

---

## Step-by-Step Example

### Setup

You have two accounts:
- `HSBC Savings` (Bank) — NT$50,000
- `Visa Platinum` (Credit Card) — current outstanding debt NT$2,000

In Settings, set Visa Platinum's **Initial Balance** to `2000`.

---

### 1. Spend on the credit card

You buy groceries for NT$1,200 with the credit card.

> **Type:** Expense
> **Account:** Visa Platinum
> **Category:** Shopping
> **Amount:** 1200

After this transaction:
- Visa Platinum outstanding debt: **3,200** (2,000 + 1,200)
- Net asset decreases by 1,200

---

### 2. More spending throughout the month

You spend NT$850 on transport and NT$3,400 dining out, both on the credit card.

After all spending:
- Visa Platinum outstanding debt: **7,450**

---

### 3. Pay the credit card bill

You pay NT$7,450 from your HSBC Savings account to clear the bill.

> **Type:** Repayment
> **From Account:** HSBC Savings
> **To Account:** Visa Platinum
> **Amount:** 7450

After this transaction:
- HSBC Savings: decreases by 7,450
- Visa Platinum outstanding debt: **0**
- Net asset is unchanged (money just moved from bank to debt payoff)

---

## Partial Payments

You can pay off only part of the balance. For example, if the bill is NT$7,450 but you only pay NT$5,000:

> **Type:** Repayment
> **From Account:** HSBC Savings
> **To Account:** Visa Platinum
> **Amount:** 5000

Remaining debt on Visa Platinum: **2,450**
This carries over into the next month automatically.

---

## Key Rules

- **Repayment From Account** must be Cash or Bank — you cannot repay one credit card with another
- **Repayment To Account** must be a Credit Card
- A credit card's balance **cannot go below zero** in normal usage (paying more than you owe is technically allowed but unusual)

---

## Net Asset and Credit Cards

Net Asset = Cash + Bank accounts − Credit Card outstanding debt

If you have NT$100,000 in savings and NT$5,000 credit card debt:
→ Net Asset = 100,000 − 5,000 = **95,000**

Archived credit card accounts can be included or excluded from net asset via the toggle in Settings.
