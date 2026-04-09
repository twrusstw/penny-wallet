# 開發者指南

本頁說明如何設定本地開發環境、貢獻程式碼，以及提交 Pull Request。

---

## 前置條件

- [Node.js](https://nodejs.org/) 18 以上版本
- [Obsidian](https://obsidian.md/) 桌面版（用於即時測試）
- Git

---

## 專案結構

```
penny-wallet/
├── src/
│   ├── main.ts                  ← 外掛進入點
│   ├── types.ts                 ← 共用型別與常數
│   ├── i18n.ts                  ← 翻譯（zh-TW、en）
│   ├── utils.ts                 ← 共用工具函式
│   ├── io/
│   │   └── WalletFile.ts        ← 所有檔案 I/O 與商業邏輯
│   ├── modal/
│   │   ├── TransactionModal.ts        ← 新增/編輯交易表單（桌面版）
│   │   ├── MobileTransactionModal.ts  ← 新增/編輯交易表單（手機版）
│   │   └── ConfirmModal.ts            ← 共用確認對話框
│   ├── view/
│   │   ├── DashboardView.ts     ← 帳本總覽
│   │   ├── DetailView.ts        ← 交易記錄清單
│   │   └── AssetView.ts         ← 資產檢視
│   └── settings/
│       └── SettingTab.ts        ← 外掛設定 UI
├── scripts/
│   ├── generate-demo-data.mjs  ← 以真實資料填充 demo vault
│   └── test-ui.mjs             ← 自動化 UI 測試執行器（Obsidian CLI）
├── demo-vault/                  ← 開發用本地 Obsidian vault
├── esbuild.config.mjs           ← 建置設定
├── manifest.json                ← Obsidian 外掛 manifest
└── styles.css                   ← 所有外掛樣式
```

---

## 設定環境

Fork 儲存庫，然後 clone 你的 fork：

```bash
git clone https://github.com/<your-username>/penny-wallet.git
cd penny-wallet
npm install
```

---

## 開發流程

### 1. 啟動監看建置

```bash
npm run dev:watch
```

這會以監看模式執行 esbuild。每次儲存檔案時：
1. TypeScript 被編譯並打包到 `main.js`
2. `main.js`、`manifest.json` 和 `styles.css` 自動複製到 `demo-vault/.obsidian/plugins/penny-wallet/`

### 2. 在 Obsidian 中開啟 demo vault

在 Obsidian 中，將 `demo-vault/` 資料夾開啟為 vault。PennyWallet 外掛已預先設定在那裡。

若尚未啟用，請至：**設定 → 社群外掛 → PennyWallet → 啟用**

> **即時重載：** 每次建置後，使用 Obsidian 指令 **Reload app without saving**。

### 3. 重置與重新填充

若 demo vault 狀態變混亂，執行完整重置：

```bash
npm run demo:reset
```

這會移除 `demo-vault/` 中所有產生的檔案（`git clean -fdx`）、還原追蹤的 `community-plugins.json`、重建外掛，並一次完成 12 個月 demo 資料的重新產生。

若只需重新產生交易資料（不清除 vault 設定）：

```bash
npm run demo:data
```

這會執行 `scripts/generate-demo-data.mjs`，建立 12 個月的真實虛擬交易，含多種帳戶類型。種子固定為 `20260403`，因此每次輸出一致。

---

## 建置指令

| 指令 | 說明 |
|------|------|
| `npm run dev:watch` | 監看模式 — 儲存時重建，同步至 demo vault |
| `npm run dev` | 單次開發建置（含 inline sourcemap） |
| `npm run build` | 正式建置（壓縮，無 sourcemap） |
| `npm run demo:data` | 以 12 個月的虛擬資料填充 demo vault |
| `npm run demo:reset` | 完整重置：清除 demo vault、重建外掛、重新填充資料 |
| `npm run lint` | ESLint + TypeScript 型別檢查 |
| `npm run lint:fix` | ESLint 自動修正 + 型別檢查 |
| `npm run test` | 執行單元 + 整合測試（Vitest） |
| `npm run test:ui` | 執行 UI 整合測試（需要 Obsidian 執行中） |

---

## 型別檢查

以僅檢查模式執行 TypeScript 編譯器（不輸出）：

```bash
npm run lint
```

或只執行型別檢查：

```bash
npx tsc --noEmit
```

本專案目標為 **ES2018**，使用 `lib: ["ES2017", "DOM"]`。請避免使用這些函式庫之外的 API（例如 `Array.flat()` — 請改用迴圈）。

---

## Lint

ESLint 透過 `eslint.config.mjs` 設定，規則繼承自 `typescript-eslint` 推薦設定。

```bash
# 僅檢查
npm run lint

# 自動修正（僅安全修正）
npm run lint:fix
```

---

## 測試

執行單元與整合測試：

```bash
npm test
```

執行 UI 整合測試（需要 Obsidian 開啟 `demo-vault`）：

```bash
npm run test:ui
```

測試使用 [Vitest](https://vitest.dev/) 撰寫，位於 `tests/`。UI 測試透過 Obsidian CLI 驅動真實實例。詳見 [測試](./testing) 頁面。

### 手動測試清單 {#manual-test-checklist}

開啟 PR 前，請驗證以下項目：

**交易**
- [ ] 新增支出 / 收入 / 轉帳 / 還款 — 全部正確儲存
- [ ] 編輯同月份的交易
- [ ] 編輯交易並將日期改至不同月份（跨月移動）
- [ ] 刪除交易 — 確認對話框出現，餘額更新

**帳戶**
- [ ] 新增現金 / 銀行 / 信用卡帳戶
- [ ] 編輯帳戶名稱和初始餘額 — 餘額重新計算
- [ ] 封存有交易記錄的帳戶 — 從表單消失，歷史記錄保留
- [ ] 解除封存帳戶 — 重新出現在交易表單
- [ ] 刪除無交易記錄的帳戶

**信用卡**
- [ ] 記錄信用卡支出 — 欠款增加
- [ ] 記錄從銀行到信用卡的還款 — 兩個餘額都更新
- [ ] 淨資產反映信用卡欠款為負值

**帳本總覽**
- [ ] 月份導覽正確（上/下月，未來月份停用）
- [ ] 收入 / 支出 / 結餘指標正確
- [ ] 帳戶餘額符合預期值
- [ ] 圓餅圖以正確比例渲染，懸停醒目顯示

**收支明細**
- [ ] 類型篩選標籤正常運作
- [ ] 分類下拉選單出現並正確篩選
- [ ] 小計符合篩選後的交易

**資產檢視**
- [ ] 3 / 6 / 12 個月範圍選擇器切換資料
- [ ] 帳戶餘額與淨資產數值正確
- [ ] 淨資產趨勢折線圖正常渲染且懸停可顯示提示框
- [ ] 兩個以上正餘額現金/銀行帳戶時可顯示資產配置圓餅圖

**設定**
- [ ] 資料夾名稱更改後保持
- [ ] 預設帳戶更改後套用至新交易表單
- [ ] 小數位數切換：新交易正確接受小數 / 整數
- [ ] 自訂分類：新增、重複確認、移除

---

## 程式碼慣例

### 檔案組織
- 商業邏輯和檔案 I/O 專屬於 `src/io/WalletFile.ts`
- UI 渲染按檢視分割 — 每個檢視檔案自成一體
- 共用工具函式放在 `src/utils.ts`；共用 modal 元件放在 `src/modal/`

### 國際化（i18n）
- 所有面向使用者的字串必須使用 `src/i18n.ts` 中的 `t('key')`
- 在 `zh-TW` 和 `en` 兩個區塊都要新增 key
- 分類 key（例如 `food`）透過 `translateCategory()` 翻譯，不用 `t()`

### 樣式
- 所有 CSS 類別以 `.pw-` 前綴，避免與 Obsidian 命名空間衝突
- 使用 Obsidian CSS 變數（`--text-muted`、`--interactive-accent` 等）以相容主題
- 只有動態計算值（例如圖表顏色、canvas 定位）才可以使用行內樣式

### TypeScript
- 避免使用 `as any` — 若必須使用，請加上說明原因的註解
- `getConfig()` 回傳內部狀態的直接參照 — 請視為唯讀；使用 `updateConfig()` 修改
- 新事件名稱必須遵循 `penny-wallet:<event>` 的命名規範

---

## 提交 Pull Request

1. 從 `dev` 建立分支（不是 `main`）：
   ```bash
   git checkout dev
   git checkout -b feat/your-feature-name
   ```
2. 進行更改，並執行 [手動測試清單](#manual-test-checklist)
3. 執行所有檢查：
   ```bash
   npm run lint
   npm test
   npm run test:ui   # 需要 Obsidian 開啟 demo-vault
   ```
4. 推送分支並對 `dev` 分支開啟 PR
5. 說明你更改了什麼以及原因 — 若 UI 有影響，請附上截圖

> **注意：** 版本發布由維護者管理。合併到 `dev` 的 PR 會批次加入版本發布；請不要自行標記或發布版本。
