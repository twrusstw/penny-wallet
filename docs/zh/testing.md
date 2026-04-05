# 測試指南

本頁說明 PennyWallet 的自動化測試策略、如何設定測試環境，以及涵蓋的測試範圍。

---

## 概述

PennyWallet 使用 **[Vitest](https://vitest.dev/)** 作為測試執行器。選擇 Vitest 的原因：

- 原生支援 ESM 和 TypeScript（不需要額外的轉換設定）
- 與專案的 `ES2018` / `lib: ES2017` 目標相容
- 快速的 HMR 監看模式
- 透過 `@vitest/coverage-v8` 內建覆蓋率報告

---

## 測試金字塔

```
         /  E2E  \           （未自動化 — 使用 demo vault 手動測試）
        /  整合測試 \          Obsidian API 已模擬：檔案 I/O、設定 CRUD
       /   單元測試  \         純函式：解析、商業邏輯、工具函式
```

自動化覆蓋率的重點在 `WalletFile.ts`、`utils.ts` 和 `types.ts` 中的**純函式**，這些函式不需要任何模擬，可在幾毫秒內執行完畢。

---

## 目錄結構

```
penny-wallet/
├── src/
│   └── ...
├── tests/
│   ├── setup.ts               ← Vitest 全域設定（Obsidian mock stubs）
│   ├── helpers/
│   │   └── mockApp.ts         ← 記憶體內 Obsidian vault mock
│   ├── unit/
│   │   ├── parsing.test.ts    ← parseRow、formatRow、parseFrontmatter、buildMonthContent
│   │   ├── business.test.ts   ← computeWalletBalances、computeNetAsset、computeSummary
│   │   └── utils.test.ts      ← formatAmount、stepMonth、dateToYearMonth 等
│   └── integration/
│       ├── walletFile.test.ts ← readMonth、writeTransaction、updateTransaction（含 mock vault）
│       └── config.test.ts     ← loadConfig、saveConfig
└── vitest.config.ts
```

---

## 設定

### 安裝

```bash
npm install --save-dev vitest @vitest/coverage-v8
```

### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/view/**', 'src/modal/**', 'src/settings/**'],
    },
  },
})
```

> 檢視、Modal 和設定因依賴完整的 Obsidian DOM 而排除在自動化覆蓋率之外，請使用 demo vault 手動測試。

### `tests/setup.ts` — Obsidian API stubs

```ts
import { vi } from 'vitest'

class TFile {
  path: string = ''
  basename: string = ''
  constructor(path: string = '') {
    this.path = path
    this.basename = path ? path.split('/').pop()!.replace(/\.md$/, '') : ''
  }
}

vi.mock('obsidian', () => ({
  normalizePath: (p: string) => p.replace(/\\/g, '/'),
  TFile,
  App: class App {},
  Modal: class Modal {
    app: unknown
    contentEl = { empty: vi.fn(), createEl: vi.fn(), createDiv: vi.fn(), addClass: vi.fn() }
    constructor(app: unknown) { this.app = app }
    open() {} close() {}
  },
  Notice: class Notice { constructor(_: string) {} },
  Plugin: class Plugin {},
}))

// window.moment stub（getLocaleCashName 使用）
Object.defineProperty(global, 'window', {
  value: { moment: { locale: () => 'en' } },
  writable: true,
})
```

> `TFile` 需要宣告成完整的 class（含 `path`/`basename` 欄位）。`mockApp.ts` 用 `Object.assign(new TFile(), { path, basename })` 建立實例，確保 `instanceof TFile` 在 production code 和 test helper 之間能正確運作。

### `package.json` 腳本

```json
"test":          "vitest run",
"test:watch":    "vitest",
"test:coverage": "vitest run --coverage"
```

---

## 單元測試：純函式

### 1. Markdown 解析（`tests/unit/parsing.test.ts`）

這些函式為**純函式**（無 I/O，無 Obsidian API）：

| 函式 | 測試項目 |
|------|---------|
| `parseRow` | 有效列 → 正確的 Transaction 物件 |
| `parseRow` | `payment` 類型 → 正規化為 `repayment`（向後相容） |
| `parseRow` | `-` 欄位 → 結果中為 `undefined` |
| `parseRow` | 少於 8 欄 → `null` |
| `parseRow` | 非數字金額 → `null` |
| `formatRow` | 與 `parseRow` 往返（格式化 → 解析 → 相同物件） |
| `parseMonthFile` | 含 frontmatter 的完整檔案內容 → 僅交易記錄 |
| `parseMonthFile` | 中文標頭（`| 日期`）→ 正確解析 |
| `parseMonthFile` | 檔案中有多個表格 → 只解析第一個連續表格 |
| `parseFrontmatter` | 有效 frontmatter → `{ income, expense, netAsset }` |
| `parseFrontmatter` | 缺少 frontmatter → `{}` |
| `buildMonthContent` | 產生 frontmatter + 標題 + 標頭列 |
| `buildMonthContent` | 空交易清單 → 只有標頭列，無資料列 |
| `dateToYearMonth` | `"2026-04-03"` → `"2026-04"` |
| `dateToMonthDay` | `"2026-04-03"` → `"04/03"` |

### 2. 商業邏輯（`tests/unit/business.test.ts`）

`computeWalletBalances` — 接受交易清單和設定，回傳餘額。

| 情境 | 預期結果 |
|------|---------|
| 銀行支出 → 餘額減少 | `initialBalance - amount` |
| 信用卡支出 → 欠款增加 | `initialBalance + amount` |
| 銀行收入 → 餘額增加 | `initialBalance + amount` |
| 轉帳 → 來源減少，目標增加 | 兩者都正確 |
| 還款 → 銀行減少，信用卡欠款減少 | 兩者都正確 |
| 設定中不存在的帳戶 → 靜默忽略 | 不崩潰 |
| 帳戶排序 → 始終依現金 → 銀行 → 信用卡 | 排序驗證 |

`computeNetAsset`

| 情境 | 預期 |
|------|------|
| 無信用卡 | `Σ(現金 + 銀行)` |
| 有信用卡 | `Σ(現金 + 銀行) - 信用卡欠款` |
| `includeInNetAsset: false` 的封存帳戶 | 排除在外 |
| `includeInNetAsset: true` 的封存帳戶 | 計入 |

`computeSummary`

| 情境 | 預期 |
|------|------|
| 只有支出 | `income: 0, expense: Σ` |
| 只有收入 | `income: Σ, expense: 0` |
| 轉帳/還款排除 | 不計入任一項 |
| `netAsset` 始終為 0 | （frontmatter 快取專用） |

`groupByCategory`

| 情境 | 預期 |
|------|------|
| 相同分類多筆 | 正確加總 |
| 缺少分類 → 退為 `'other'` | `other` key 獲得金額 |
| 類型篩選有效 | 收入交易排除在支出分組之外 |

### 3. 工具函式（`tests/unit/utils.test.ts`）

| 函式 | 測試案例 |
|------|---------|
| `formatAmount(1234, 0)` | 包含 "1234"（千分位格式依 locale 而異） |
| `formatAmount(1234.5, 2)` | 以 ".50" 結尾 |
| `stepMonth("2026-01", 1)` | `"2026-02"` |
| `stepMonth("2026-12", 1)` | `"2027-01"`（跨年） |
| `stepMonth("2026-01", -1)` | `"2025-12"`（跨年往回） |
| `isAfterCurrentMonth` | 未來月份 → `true`；當月 → `false`；過去 → `false` |
| `dateToYearMonth` | 擷取前 7 個字元 |
| `dateToMonthDay` | `MM/DD` 格式 |

---

## 整合測試：含模擬 `App` 的 Vault I/O

這些測試需要一個模擬記憶體內 Obsidian vault 的 `MockApp` helper。

### MockApp helper（`tests/helpers/mockApp.ts`）

```ts
import { TFile } from 'obsidian'

export function createMockApp(initialFiles: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initialFiles))

  const makeTFile = (path: string) => Object.assign(new TFile(), {
    path,
    basename: path.split('/').pop()!.replace(/\.md$/, ''),
  })

  // ... vault 實作
  return { app: { vault } as any, store }
}
```

`store` 直接暴露給測試，方便驗證 vault 內容。

### 設定 I/O（`tests/integration/config.test.ts`）

| 情境 | 預期 |
|------|------|
| 磁碟上無設定檔（首次啟動） | 建立含 locale 現金名稱的 `.penny-wallet.json` |
| `.penny-wallet.json` 存在 | 載入並回傳 |
| 格式錯誤的 JSON | 退為 `DEFAULT_CONFIG` |
| `updateConfig` 後 `saveConfig` | 將修改持久化至記憶體內 vault |
| `updateConfig` 後 `getConfig` | 回傳最新的記憶體內值 |

### 交易 CRUD（`tests/integration/walletFile.test.ts`）

| 情境 | 預期 |
|------|------|
| 空月份的 `writeTransaction` | 建立月份檔案，1 列 |
| `writeTransaction` — 排序 | 較新的日期在檔案中優先顯示 |
| `writeTransaction` — frontmatter 更新 | `income` / `expense` 符合加總 |
| 同月份 `updateTransaction` | 就地替換列 |
| 跨月份 `updateTransaction` | 從舊月份刪除，插入新月份 |
| `deleteTransaction` 最後一列 | 檔案仍存在，表格內容為空 |
| 無檔案的 `readMonth` | 回傳 `[]` |
| `calculateWalletData` | `walletsWithTransactions` 包含已使用的帳戶名稱 |
| `getNetAssetTimeline` 累積 | 每月淨資產等於手動計算值 |

---

## 手動測試清單

請參閱 [開發者指南 → 手動測試清單](./developer-guide#manual-test-checklist)，查看使用 demo vault 的完整發布前清單。

---

## 覆蓋率目標

| 範圍 | 目標 |
|------|------|
| `src/io/WalletFile.ts`（純方法） | ≥ 90% |
| `src/utils.ts` | 100% |
| `src/types.ts`（遷移 helpers） | 100% |
| 檢視 / Modal / 設定（UI） | 僅手動 |

執行覆蓋率：

```bash
npm run test:coverage
```

HTML 報告輸出至 `coverage/`（已加入 .gitignore）。
