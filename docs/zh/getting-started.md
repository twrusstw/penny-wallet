# 快速開始

## 安裝方式

### 手動安裝

1. 從 [最新版本](https://github.com/twrusstw/penny-wallet/releases/latest) 下載 `main.js`、`manifest.json` 和 `styles.css`
2. 在 vault 中建立資料夾 `<your-vault>/.obsidian/plugins/penny-wallet/`
3. 將三個檔案複製到該資料夾
4. 開啟 Obsidian → **設定 → 社群外掛** → 啟用 **PennyWallet**

### 社群外掛商店

在 **設定 → 社群外掛 → 瀏覽** 中搜尋 **PennyWallet**，然後安裝並啟用。

---

## 初始設定

### 步驟一 — 新增帳戶

前往 **設定 → PennyWallet → 使用中帳戶**，點擊 **新增帳戶**。

為每個帳戶填入：

- **名稱** — 任意標籤（例如 `現金`、`玉山銀行`、`信用卡`）
- **類型** — `現金`、`銀行`或`信用卡`
- **初始餘額** — 目前的餘額（信用卡請輸入目前的欠款金額，例如 `3000` 表示欠 3,000 元）

> **提示：** 建議在記錄任何交易前先新增所有帳戶，這樣餘額計算從一開始就正確。

### 步驟二 — 設定預設帳戶

在 **設定 → PennyWallet → 一般**，選擇開啟新增交易表單時預設選取的帳戶。

### 步驟三 — 記錄第一筆交易

點擊左側面板的 **PennyWallet 圖示** 開啟帳本總覽，然後按下 **+ 新增交易**。

也可以使用指令面板（`Cmd+P`）：

| 指令 | 動作 |
|------|------|
| `PennyWallet: Open Finance Overview` | 開啟儀表板 |
| `PennyWallet: Open Transactions` | 開啟交易清單 |
| `PennyWallet: Open assets` | 開啟資產檢視 |
| `PennyWallet: Add Transaction` | 直接開啟交易表單 |
| `PennyWallet: Refresh views` | 重新整理所有已開啟的 PennyWallet 檢視 |

填寫欄位：
- **類型** — 支出、收入、轉帳或還款
- **日期** — 預設為今天
- **帳戶** — 選擇記錄的帳戶
- **分類** — 從清單中選擇或留空
- **備註** — 選填說明
- **金額**

按下 **確認** 儲存。

---

## 資料存放位置

PennyWallet 會建立：

```
<vault>/
├── .penny-wallet.json     ← 設定檔（帳戶、分類、設定）
└── PennyWallet/           ← 每月一個 .md 檔案
    ├── 2026-04.md
    └── 2026-03.md
```

資料夾名稱（預設為 `PennyWallet`）可在設定中更改。詳見 [資料格式](./data-format)。
