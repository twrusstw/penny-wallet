# URI Handler 與 iOS 捷徑

PennyWallet 註冊了 `obsidian://penny-wallet` URI scheme。任何可以開啟 URL 的 App — 包括 iOS 捷徑、Android 自動化工具或瀏覽器書籤 — 都可以預填欄位開啟交易表單。

---

## URI 格式

```
obsidian://penny-wallet?參數1=值1&參數2=值2
```

### 可用參數

| 參數 | 必填 | 說明 | 範例 |
|------|------|------|------|
| `type` | 否 | 交易類型，預設 `expense` | `expense` / `income` / `transfer` / `repayment` |
| `amount` | 否 | 金額 | `250` |
| `note` | 否 | 備註 | `午餐` |
| `category` | 否 | 分類 key（預設分類）或自訂名稱 | `food` / `transport` / `我的分類` |
| `wallet` | 否 | 帳戶名稱（支出 / 收入用） | `玉山銀行` |
| `fromWallet` | 否 | 來源帳戶（轉帳 / 還款用） | `玉山銀行` |
| `toWallet` | 否 | 目標帳戶（轉帳 / 還款用） | `玉山信用卡` |
| `date` | 否 | 日期，格式 `yyyy-mm-dd`，預設今天 | `2026-04-05` |

### 分類 key 對照

| key | 中文 | 英文 |
|-----|------|------|
| `food` | 餐飲 | Food |
| `transport` | 交通 | Transport |
| `shopping` | 購物 | Shopping |
| `entertainment` | 娛樂 | Entertainment |
| `medical` | 醫療 | Medical |
| `housing` | 居家 | Home |
| `other` | 其他 | Other |
| `salary` | 薪資 | Salary |
| `bonus` | 獎金 | Bonus |
| `side_income` | 副業 | Side Income |

---

## 範例 URI

**快速支出（僅預設類型）：**
```
obsidian://penny-wallet?type=expense
```

**預填金額與分類：**
```
obsidian://penny-wallet?type=expense&amount=280&category=food&note=午餐
```

**指定帳戶：**
```
obsidian://penny-wallet?type=expense&amount=1200&category=shopping&wallet=玉山信用卡
```

**收入：**
```
obsidian://penny-wallet?type=income&amount=72000&category=salary&wallet=玉山銀行
```

**信用卡還款：**
```
obsidian://penny-wallet?type=repayment&amount=5000&fromWallet=玉山銀行&toWallet=玉山信用卡
```

---

## iOS 捷徑設定

### 前置條件

- iPhone 已安裝 Obsidian App
- Obsidian 已開啟 PennyWallet 所在的 vault
- 已在 PennyWallet 設定中建立帳戶

### 範例：快速記支出

1. 打開 iPhone **捷徑** App → 點右上角 **+** 新增捷徑
2. 點 **新增動作** → 搜尋「**詢問輸入**」
   - 提示：`金額`
   - 輸入類型：`數字`
   - 儲存結果為變數 `amount`
3. 再新增一個「**詢問輸入**」
   - 提示：`備註（可留空）`
   - 輸入類型：`文字`
   - 儲存結果為變數 `note`
4. 新增「**從選單選擇**」
   - 提示：`分類`
   - 選項：`food`、`transport`、`shopping`、`entertainment`、`other`（依需求調整）
   - 儲存結果為變數 `category`
5. 新增「**開啟 URL**」
   - URL 填入：
     ```
     obsidian://penny-wallet?type=expense&amount=[amount]&note=[note]&category=[category]
     ```
   - 其中 `[amount]`、`[note]`、`[category]` 替換為對應的**捷徑變數**
6. 點右上角完成，為捷徑命名（例如：`記帳`）

---

## 進階範例

### 指定帳戶 + 自動填今天日期

```
obsidian://penny-wallet?type=expense&amount=[amount]&note=[note]&category=[category]&wallet=玉山信用卡
```

### 收入記錄

```
obsidian://penny-wallet?type=income&amount=[amount]&category=salary&wallet=玉山銀行
```

### 信用卡還款

```
obsidian://penny-wallet?type=repayment&amount=[amount]&fromWallet=玉山銀行&toWallet=玉山信用卡
```

---

## 加入主畫面

1. 捷徑編輯頁 → 點上方捷徑名稱旁的 **⋯**
2. 選「**加入主畫面**」
3. 設定圖示與名稱後加入

之後點一下圖示即可快速開啟記帳表單。

---

## 注意事項

- URI 中的帳戶名稱必須與 PennyWallet 設定中的完全相符（區分大小寫）
- 表單一定會開啟讓使用者確認 — URI 無法靜默送出交易
- 若帳戶或分類名稱含有空格或非 ASCII 字元，請進行 URL 編碼（iOS 捷徑會自動處理）
