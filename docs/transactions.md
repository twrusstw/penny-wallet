# Transactions

PennyWallet has four transaction types. Each is designed for a specific real-world scenario.

---

## Transaction Types

### Expense

Money leaving one of your accounts for a purchase or payment.

| Field | Required | Notes |
|-------|----------|-------|
| Account | Yes | The account the money came from |
| Category | No | e.g. Food, Transport, Shopping |
| Note | No | Free-text description |
| Amount | Yes | Positive number |

**Effect on balance:**
- Cash / Bank account → balance decreases
- Credit Card → outstanding debt increases

**Example:** Paid NT$280 for lunch with cash
→ Account: `Cash`, Category: `Food`, Amount: `280`

---

### Income

Money arriving into one of your accounts.

| Field | Required | Notes |
|-------|----------|-------|
| Account | Yes | The account receiving the money |
| Category | No | e.g. Salary, Bonus, Side Income |
| Note | No | Free-text description |
| Amount | Yes | Positive number |

**Effect on balance:**
- Any account type → balance increases

**Example:** Monthly salary deposited into HSBC
→ Account: `HSBC Savings`, Category: `Salary`, Amount: `72000`

---

### Transfer

Moving money between two of your own accounts. No category.

| Field | Required | Notes |
|-------|----------|-------|
| From Account | Yes | Source account |
| To Account | Yes | Destination account (must differ from source) |
| Note | No | e.g. `Transfer to savings` |
| Amount | Yes | Positive number |

**Effect on balance:**
- From Account → balance decreases
- To Account → balance increases

**Example:** Withdraw NT$8,000 cash from ATM
→ From: `HSBC Savings`, To: `Cash`, Amount: `8000`

---

### Repayment

Pay off a credit card bill from a bank or cash account.

| Field | Required | Notes |
|-------|----------|-------|
| From Account | Yes | Must be Cash or Bank (not a credit card) |
| To Account | Yes | Must be a Credit Card |
| Note | No | e.g. `Card payment` |
| Amount | Yes | Positive number |

**Effect on balance:**
- From Account (Cash/Bank) → balance decreases
- To Account (Credit Card) → outstanding debt decreases

**Example:** Pay NT$5,200 credit card bill from savings
→ From: `HSBC Savings`, To: `Visa Platinum`, Amount: `5200`

> See [Credit Card Workflow](./credit-card-workflow) for the full credit card cycle.

---

## Adding a Transaction

**From Finance Overview or Transactions view:** click **+ Add Transaction**

**From the Command Palette:** run `PennyWallet: Add Transaction`

**From the ribbon icon:** click the balloon icon → then **+ Add Transaction**

**From iOS Shortcuts:** see [URI Handler & iOS Shortcuts](./uri-handler)

---

## Editing and Deleting

Open the **Transactions** view, find the entry, and click the **edit (✏)** or **delete (🗑)** icon on the right side of the row.

Editing supports changing the **date** (including moving the transaction to a different month), the type, account, category, note, and amount.

---

## Default Categories

### Expense
`Food` · `Transport` · `Shopping` · `Entertainment` · `Medical` · `Home` · `Other`

### Income
`Salary` · `Bonus` · `Side Income` · `Other`

Custom categories can be added in **Settings → PennyWallet → Custom Categories**.
