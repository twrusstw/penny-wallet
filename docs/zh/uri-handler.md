# URI Handler 與 iOS 捷徑

PennyWallet 註冊了 `obsidian://penny-wallet` URI scheme。任何可以開啟 URL 的 App — 包括 iOS 捷徑、Android 自動化工具或瀏覽器書籤 — 都可以預填欄位開啟交易表單。

---

## URI 格式

```
obsidian://penny-wallet?參數1=值1&參數2=值2
```

### 可用參數

| 參數 | 必填 | 說明 |
|------|------|------|
| `type` | 否 | `expense`（預設）/ `income` / `transfer` |
| `amount` | 否 | 金額 |
| `note` | 否 | 備註 |
| `category` | 否 | 分類 key 或自訂名稱 |
| `wallet` | 否 | 帳戶名稱（支出 / 收入用） |
| `fromWallet` | 否 | 來源帳戶（移轉用） |
| `toWallet` | 否 | 目標帳戶（移轉用） |
| `date` | 否 | 日期，格式 `yyyy-mm-dd`，預設今天 |

### 分類 key 對照

**支出**

| key | 中文 | 英文 |
|-----|------|------|
| `food` | 飲食 | Food |
| `clothing` | 服飾 | Clothing |
| `housing` | 住家 | Home |
| `transport` | 交通 | Transport |
| `education` | 學習 | Education |
| `entertainment` | 休閒娛樂 | Entertainment |
| `shopping` | 購物 | Shopping |
| `medical` | 醫療 | Medical |
| `cash_expense` | 現金消費 | Cash Expense |
| `insurance` | 保險 | Insurance |
| `fees` | 費用／手續費 | Fees |
| `tax` | 稅金 | Tax |

**收入**

| key | 中文 | 英文 |
|-----|------|------|
| `salary` | 薪資 | Salary |
| `interest` | 利息所得 | Interest |
| `side_income` | 兼職 | Side Income |
| `bonus` | 獎金 | Bonus |
| `lottery` | 發票／彩券中獎 | Lottery |
| `rent` | 租金 | Rent |
| `cashback` | 優惠回饋 | Cashback |
| `dividend` | 股利 | Dividend |
| `investment_profit` | 投資獲利 | Investment Profit |
| `insurance_income` | 保險理賠 | Insurance Claim |
| `pension` | 退休金 | Pension |

**移轉**

| key | 中文 | 英文 |
|-----|------|------|
| `account_transfer` | 帳戶互轉 | Account Transfer |
| `credit_card_payment` | 信用卡繳費 | Credit Card Payment |
| `credit_card_refund` | 信用卡刷退 | Credit Card Refund |
| `investment_trade` | 投資買賣 | Investment Trade |

---

## 範例

```
obsidian://penny-wallet?type=expense&amount=280&category=food&note=午餐
```

---

## iOS 捷徑設定

1. 打開 iPhone **捷徑** App → 點右上角 **+** 新增捷徑
2. 新增動作「**詢問輸入**」→ 提示 `金額`、類型 `數字`，儲存為變數 `amount`
3. 新增動作「**詢問輸入**」→ 提示 `備註（可留空）`、類型 `文字`，儲存為變數 `note`
4. 新增動作「**從選單選擇**」→ 提示 `分類`、選項 `food`、`transport`、`shopping`、`entertainment`、`medical`，儲存為變數 `category`
5. 新增動作「**開啟 URL**」：
   ```
   obsidian://penny-wallet?type=expense&amount=[amount]&note=[note]&category=[category]
   ```
   將 `[amount]`、`[note]`、`[category]` 替換為對應的捷徑變數。
6. 點完成並為捷徑命名（例如：`記帳`）

加入主畫面：捷徑編輯頁 → 點 **⋯** → **加入主畫面**。

---

## 常見問題

**支援多個 vault 嗎？**

不支援。PennyWallet 無法透過 URI 指定目標 vault，URI 一律在當前使用中的 vault 開啟。

**帳戶與分類名稱需要完全相符嗎？**

是，區分大小寫，必須與 PennyWallet 設定中的名稱完全一致。

**URI 可以靜默送出交易嗎？**

不行。表單一定會開啟讓使用者確認，無法靜默送出。

**帳戶或分類名稱含有空格或中文時需要 URL 編碼嗎？**

需要。iOS 捷徑會自動處理，其他工具請手動編碼。
