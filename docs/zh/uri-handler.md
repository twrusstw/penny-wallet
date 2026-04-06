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
| `type` | 否 | `expense`（預設）/ `income` / `transfer` / `repayment` |
| `amount` | 否 | 金額 |
| `note` | 否 | 備註 |
| `category` | 否 | 分類 key 或自訂名稱 |
| `wallet` | 否 | 帳戶名稱（支出 / 收入用） |
| `fromWallet` | 否 | 來源帳戶（轉帳 / 還款用） |
| `toWallet` | 否 | 目標帳戶（轉帳 / 還款用） |
| `date` | 否 | 日期，格式 `yyyy-mm-dd`，預設今天 |

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

## 範例

```
obsidian://penny-wallet?type=expense&amount=280&category=food&note=午餐
```

---

## iOS 捷徑設定

1. 打開 iPhone **捷徑** App → 點右上角 **+** 新增捷徑
2. 新增動作「**詢問輸入**」→ 提示 `金額`、類型 `數字`，儲存為變數 `amount`
3. 新增動作「**詢問輸入**」→ 提示 `備註（可留空）`、類型 `文字`，儲存為變數 `note`
4. 新增動作「**從選單選擇**」→ 提示 `分類`、選項 `food`、`transport`、`shopping`、`entertainment`、`other`，儲存為變數 `category`
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
