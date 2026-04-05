# URI Handler & iOS Shortcuts

PennyWallet registers the `obsidian://penny-wallet` URI scheme. Any app that can open a URL — including iOS Shortcuts, Android automation tools, or browser bookmarks — can open the transaction form with fields pre-filled.

---

## URI Format

```
obsidian://penny-wallet?param1=value1&param2=value2
```

### Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `type` | No | Transaction type, defaults to `expense` | `expense` / `income` / `transfer` / `repayment` |
| `amount` | No | Amount | `250` |
| `note` | No | Note / description | `Lunch` |
| `category` | No | Category key (default) or custom name | `food` / `transport` / `My Category` |
| `vault` | No | Target vault name. Recommended when multiple vaults have PennyWallet installed | `My Finance Vault` |
| `wallet` | No | Account name (for expense / income) | `HSBC Savings` |
| `fromWallet` | No | Source account (for transfer / repayment) | `HSBC Savings` |
| `toWallet` | No | Destination account (for transfer / repayment) | `Visa Platinum` |
| `date` | No | Date in `yyyy-mm-dd` format, defaults to today | `2026-04-05` |

### Default Category Keys

| Key | English | Chinese |
|-----|---------|---------|
| `food` | Food | 飲食 |
| `transport` | Transport | 交通 |
| `shopping` | Shopping | 購物 |
| `entertainment` | Entertainment | 娛樂 |
| `medical` | Medical | 醫療 |
| `housing` | Home | 居家 |
| `other` | Other | 其他 |
| `salary` | Salary | 薪資 |
| `bonus` | Bonus | 獎金 |
| `side_income` | Side Income | 副業 |

---

## Example URIs

**Quick expense (opens form with type pre-set):**
```
obsidian://penny-wallet?type=expense
```

**Pre-fill amount and category:**
```
obsidian://penny-wallet?type=expense&amount=280&category=food&note=Lunch
```

**Target a specific vault:**
```
obsidian://penny-wallet?vault=My%20Finance%20Vault&type=expense&amount=280&category=food&note=Lunch
```

**Specify account:**
```
obsidian://penny-wallet?type=expense&amount=1200&category=shopping&wallet=Visa Platinum
```

**Income:**
```
obsidian://penny-wallet?type=income&amount=72000&category=salary&wallet=HSBC Savings
```

**Credit card repayment:**
```
obsidian://penny-wallet?type=repayment&amount=5000&fromWallet=HSBC Savings&toWallet=Visa Platinum
```

---

## iOS Shortcuts Setup

### Quick Expense Shortcut

1. Open the **Shortcuts** app → tap **+** to create a new shortcut
2. Add action: **Ask for Input**
   - Prompt: `Amount`
   - Input type: `Number`
   - Save to variable: `amount`
3. Add action: **Ask for Input**
   - Prompt: `Note (optional)`
   - Input type: `Text`
   - Save to variable: `note`
4. Add action: **Choose from Menu**
   - Prompt: `Category`
   - Options: `food`, `transport`, `shopping`, `entertainment`, `other`
   - Save to variable: `category`
5. Add action: **Open URL**
   - URL:
     ```
     obsidian://penny-wallet?type=expense&amount=[amount]&note=[note]&category=[category]
     ```
     Replace `[amount]`, `[note]`, `[category]` with the corresponding **Shortcut variables**
6. Tap **Done**, name the shortcut (e.g. `Log Expense`)

### Multiple Vaults

If you have more than one vault with PennyWallet installed, add the `vault` parameter so Obsidian opens the correct vault before the plugin handles the URI.

```
obsidian://penny-wallet?vault=My%20Finance%20Vault&type=expense&amount=[amount]&note=[note]&category=[category]
```

You can also use the Obsidian vault ID instead of the vault name. Vault IDs are more stable for automation because they don't depend on the display name.

### Add to Home Screen

1. In the shortcut editor, tap **⋯** next to the shortcut name
2. Tap **Add to Home Screen**
3. Set an icon and name, then tap **Add**

One tap from the home screen opens the transaction form directly.

---

## Notes

- Account names in the URI must match exactly (case-sensitive) as configured in PennyWallet Settings
- When multiple vaults use PennyWallet, always include `vault` to avoid the URI opening in the wrong vault
- The form always opens for user confirmation — the URI cannot submit transactions silently
- URL-encode special characters if your account/category names contain spaces or non-ASCII characters (iOS Shortcuts handles this automatically)
