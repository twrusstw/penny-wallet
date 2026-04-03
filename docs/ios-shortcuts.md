# iOS Shortcuts 設定教學

## 前置條件

- iPhone 已安裝 Obsidian App
- Obsidian 已開啟 PennyWallet 所在的 vault
- 已在 PennyWallet 設定中建立錢包

---

## URI 格式

```
obsidian://penny-wallet?參數1=值1&參數2=值2
```

### 可用參數

| 參數 | 必填 | 說明 | 範例 |
|------|------|------|------|
| `type` | 否 | 交易類型，預設 `expense` | `expense` / `income` / `transfer` / `repayment` |
| `amount` | 是 | 金額 | `250` |
| `note` | 否 | 備註 | `午餐` |
| `category` | 否 | 分類，預設分類用 key | `food` / `transport` / `shopping` |
| `wallet` | 否 | 錢包名稱（expense / income） | `玉山信用卡` |
| `fromWallet` | 否 | 來源錢包（transfer / repayment） | `玉山銀行` |
| `toWallet` | 否 | 目標錢包（transfer / repayment） | `玉山信用卡` |
| `date` | 否 | 日期，預設今天 | `2026-04-04` |

### 分類 key 對照

| key | 中文 | 英文 |
|-----|------|------|
| `food` | 餐飲 | Food |
| `transport` | 交通 | Transport |
| `shopping` | 購物 | Shopping |
| `entertainment` | 娛樂 | Entertainment |
| `medical` | 醫療 | Medical |
| `housing` | 住宿 | Housing |
| `salary` | 薪水 | Salary |
| `bonus` | 獎金 | Bonus |
| `side_income` | 副業 | Side Income |
| `other` | 其他 | Other |

---

## 捷徑設定步驟

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

### 指定錢包 + 自動填今天日期

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

之後點一下圖示即可快速開啟記帳 Modal。
