# URI Handler & iOS Shortcuts

PennyWallet registers the `obsidian://penny-wallet` URI scheme. Any app that can open a URL — including iOS Shortcuts, Android automation tools, or browser bookmarks — can open the transaction form with fields pre-filled.

---

## URI Format

```
obsidian://penny-wallet?param1=value1&param2=value2
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `type` | No | `expense` (default) / `income` / `transfer` / `repayment` |
| `amount` | No | Amount |
| `note` | No | Note / description |
| `category` | No | Category key or custom name |
| `wallet` | No | Account name (expense / income) |
| `fromWallet` | No | Source account (transfer / repayment) |
| `toWallet` | No | Destination account (transfer / repayment) |
| `date` | No | Date in `yyyy-mm-dd` format, defaults to today |

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

## Example

```
obsidian://penny-wallet?type=expense&amount=280&category=food&note=Lunch
```

---

## iOS Shortcuts Setup

1. Open the **Shortcuts** app → tap **+** to create a new shortcut
2. Add action: **Ask for Input** → prompt `Amount`, type `Number`, save to variable `amount`
3. Add action: **Ask for Input** → prompt `Note (optional)`, type `Text`, save to variable `note`
4. Add action: **Choose from Menu** → prompt `Category`, options: `food`, `transport`, `shopping`, `entertainment`, `other`, save to variable `category`
5. Add action: **Open URL**:
   ```
   obsidian://penny-wallet?type=expense&amount=[amount]&note=[note]&category=[category]
   ```
   Replace `[amount]`, `[note]`, `[category]` with the corresponding Shortcut variables.
6. Tap **Done** and name the shortcut (e.g. `Log Expense`)

To add it to the home screen: tap **⋯** → **Add to Home Screen**.

---

## FAQ

**Can I use this with multiple vaults?**

No. PennyWallet does not support targeting a specific vault via URI. The URI always opens in whichever vault is currently active.

**Do account and category names need to match exactly?**

Yes — they are case-sensitive and must match what's configured in PennyWallet Settings.

**Can the URI submit a transaction silently?**

No. The form always opens for user confirmation — silent submission is not supported.

**Do I need to URL-encode special characters?**

Yes, if your account or category names contain spaces or non-ASCII characters. iOS Shortcuts handles this automatically.
