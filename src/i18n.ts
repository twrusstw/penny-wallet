type Locale = 'zh-TW' | 'en'

const translations = {
  'zh-TW': {
    // Transaction types
    'type.expense': '支出',
    'type.income': '收入',
    'type.transfer': '轉帳',
    'type.repayment': '還款',

    // Wallet types
    'walletType.cash': '現金',
    'walletType.bank': '銀行帳戶',
    'walletType.creditCard': '信用卡',

    // Default expense categories
    'cat.food': '飲食',
    'cat.transport': '交通',
    'cat.shopping': '購物',
    'cat.entertainment': '娛樂',
    'cat.medical': '醫療',
    'cat.housing': '居家',
    'cat.other': '其他',

    // Default income categories
    'cat.salary': '薪資',
    'cat.bonus': '獎金',
    'cat.side_income': '副業',

    // UI labels
    'ui.addTransaction': '新增交易',
    'ui.detail': '明細',
    'ui.confirm': '確認',
    'ui.cancel': '取消',
    'ui.delete': '刪除',
    'ui.edit': '編輯',
    'ui.archive': '封存',
    'ui.save': '儲存',

    // Dashboard
    'dashboard.title': '帳本總覽',
    'dash.income': '收入',
    'dash.expense': '支出',
    'dash.balance': '結餘',
    'dash.netAsset': '淨資產',
    'dash.walletBalances': '帳戶餘額',
    'dash.assetAllocation': '資金占比',
    'dash.expenseByCategory': '支出分類',
    'dash.incomeByCategory': '收入分類',
    'dash.noData': '本月無資料',

    // Detail view
    'detail.title': '收支明細',
    'detail.filterAll': '全部',
    'detail.filterExpense': '支出',
    'detail.filterIncome': '收入',
    'detail.filterTransfer': '轉帳',
    'detail.filterRepayment': '還款',
    'detail.subtotalIncome': '收入小計',
    'detail.subtotalExpense': '支出小計',
    'detail.noTransactions': '無符合條件的交易',
    'detail.searchPlaceholder': '搜尋備註...',
    'detail.filterCategory': '分類',

    // Trend view
    'trend.3m': '3 個月',
    'trend.6m': '6 個月',
    'trend.12m': '12 個月',
    'trend.monthlyIncomeExpense': '每月收支',

    // Date formatting
    'date.yearMonthNumeric': '{year} 年 {month} 月',
    'date.yearMonthShort': '{year} 年 {month} 月',
    'date.monthLabel': '{month}月',

    // Transaction modal
    'modal.addTitle': '新增交易',
    'modal.editTitle': '編輯交易',
    'modal.date': '日期',
    'modal.wallet': '帳戶',
    'modal.fromWallet': '轉出帳戶',
    'modal.toWallet': '轉入帳戶',
    'modal.category': '分類',
    'modal.note': '備註',
    'modal.amount': '金額',

    // Validation errors
    'err.amountRequired': '請輸入金額',
    'err.amountPositive': '金額必須大於 0',
    'err.amountInteger': '目前設定不允許小數，請輸入整數金額',
    'err.walletRequired': '請選擇帳戶',
    'err.fromWalletRequired': '請選擇轉出帳戶',
    'err.toWalletRequired': '請選擇轉入帳戶',
    'err.sameWallet': '來源與目標錢包不能相同',
    'err.repaymentFromCredit': '來源錢包不能是信用卡',
    'err.repaymentToNonCredit': '目標錢包必須是信用卡',
    'err.walletNameEmpty': '錢包名稱不能為空',
    'err.walletNameDuplicate': '錢包名稱已存在',

    // Settings
    'settings.title': 'PennyWallet 設定',
    'settings.general': '一般設定',
    'settings.folderName': '資料夾名稱',
    'settings.folderNameDesc': '存放記帳檔案的資料夾（相對於 Vault 根目錄）',
    'settings.defaultWallet': '預設帳戶',
    'settings.defaultWalletDesc': '新增交易時預設選取的帳戶',
    'settings.decimalPlaces': '金額小數位數',
    'settings.decimalPlacesDesc': '記帳金額允許的小數位數',
    'settings.dp0': '整數（0 位）',
    'settings.dp2': '2 位小數',
    'settings.activeWallets': '使用中帳戶',
    'settings.archivedWallets': '已封存帳戶',
    'settings.addWallet': '新增帳戶',
    'settings.walletName': '名稱',
    'settings.walletType': '類型',
    'settings.initialBalance': '初始餘額',
    'settings.includeInNetAssetOn': '目前：納入淨資產',
    'settings.includeInNetAssetOff': '目前：不納入淨資產',
    'settings.customCategories': '自訂分類',
    'settings.expenseCategories': '支出',
    'settings.incomeCategories': '收入',
    'settings.addCategory': '新增分類',
    'settings.categoryPlaceholder': '輸入分類名稱',

    // Confirm dialogs
    'confirm.deleteTransaction': '確定要刪除這筆交易？此操作無法復原。',
    'confirm.archiveWallet': '確定要封存此錢包？封存後無法復原，該錢包將不再出現在交易入口中。',
    'confirm.deleteWallet': '確定要刪除此錢包？',
    'confirm.unarchiveWallet': '確定要取消封存此錢包？',

    // Onboarding
    'onboard.welcome': '歡迎使用 PennyWallet！建議先新增您的銀行帳戶與信用卡錢包。',

    // Settings — extra
    'settings.noActiveWallets': '無使用中錢包',
    'settings.creditDebtPrefix': '欠 ',
    'settings.creditBalanceHint': '信用卡填入目前未還金額（正數）。例：欠 3,000 → 填 3000',
    'settings.cashBankBalanceHint': '填入目前實際餘額（需 ≥ 0）',

    // Notices
    'notice.walletAdded': '✓ 帳戶「{name}」已新增',
    'notice.transactionDeleted': '✓ 交易已刪除',
    'notice.transactionAdded': '✓ 交易已新增',
    'notice.transactionUpdated': '✓ 交易已更新',
    'notice.loadFailed': 'PennyWallet 載入失敗，請檢查插件設定。',

    // Errors — extra
    'err.cashBankNegativeBalance': '現金與銀行帳戶餘額不能為負數',
    'err.creditNegativeBalance': '信用卡未還金額不能為負數，請填正數欠款金額',
    'err.creditNegativeBalanceShort': '信用卡未還金額請填正數',
    'err.categoryExists': '分類已存在',
    'err.categoryExistsInOtherList': '此分類名稱已存在於另一個清單中',
    'err.invalidDate': '日期格式無效',

    'ui.unarchive': '取消封存',

    // Asset view
    'asset.title': '資產',
    'ui.asset': '資產',
    'ui.overview': '總覽',
    'asset.netAssetTrend': '淨資產趨勢',
    'asset.savingsRate': '儲蓄率',
  },
  'en': {
    'type.expense': 'Expense',
    'type.income': 'Income',
    'type.transfer': 'Transfer',
    'type.repayment': 'Repayment',

    'walletType.cash': 'Cash',
    'walletType.bank': 'Bank Account',
    'walletType.creditCard': 'Credit Card',

    'cat.food': 'Food',
    'cat.transport': 'Transport',
    'cat.shopping': 'Shopping',
    'cat.entertainment': 'Entertainment',
    'cat.medical': 'Medical',
    'cat.housing': 'Home',
    'cat.other': 'Other',

    'cat.salary': 'Salary',
    'cat.bonus': 'Bonus',
    'cat.side_income': 'Side Income',

    'ui.addTransaction': 'Add Transaction',
    'ui.detail': 'Transactions',
    'ui.confirm': 'Confirm',
    'ui.cancel': 'Cancel',
    'ui.delete': 'Delete',
    'ui.edit': 'Edit',
    'ui.archive': 'Archive',
    'ui.save': 'Save',

    'dashboard.title': 'Finance Overview',
    'dash.income': 'Income',
    'dash.expense': 'Expense',
    'dash.balance': 'Balance',
    'dash.netAsset': 'Net Assets',
    'dash.walletBalances': 'Account Balances',
    'dash.assetAllocation': 'Asset Allocation',
    'dash.expenseByCategory': 'Expense by Category',
    'dash.incomeByCategory': 'Income by Category',
    'dash.noData': 'No data this month',

    'detail.title': 'Transactions',
    'detail.filterAll': 'All',
    'detail.filterExpense': 'Expense',
    'detail.filterIncome': 'Income',
    'detail.filterTransfer': 'Transfer',
    'detail.filterRepayment': 'Repayment',
    'detail.subtotalIncome': 'Income Subtotal',
    'detail.subtotalExpense': 'Expense Subtotal',
    'detail.noTransactions': 'No matching transactions',
    'detail.searchPlaceholder': 'Search notes...',
    'detail.filterCategory': 'Category',

    'trend.3m': '3 Months',
    'trend.6m': '6 Months',
    'trend.12m': '12 Months',
    'trend.monthlyIncomeExpense': 'Monthly Income & Expense',

    'date.yearMonthNumeric': '{month}/{year}',
    'date.yearMonthShort': '{monthName} {year}',
    'date.monthLabel': '{monthName}',

    'modal.addTitle': 'Add Transaction',
    'modal.editTitle': 'Edit Transaction',
    'modal.date': 'Date',
    'modal.wallet': 'Account',
    'modal.fromWallet': 'From Account',
    'modal.toWallet': 'To Account',
    'modal.category': 'Category',
    'modal.note': 'Note',
    'modal.amount': 'Amount',

    'err.amountRequired': 'Amount is required',
    'err.amountPositive': 'Amount must be greater than 0',
    'err.amountInteger': 'Decimal amounts are not allowed. Please enter a whole number.',
    'err.walletRequired': 'Please select an account',
    'err.fromWalletRequired': 'Please select source account',
    'err.toWalletRequired': 'Please select target account',
    'err.sameWallet': 'Source and target accounts cannot be the same',
    'err.repaymentFromCredit': 'Source account cannot be a credit card',
    'err.repaymentToNonCredit': 'Target account must be a credit card',
    'err.walletNameEmpty': 'Account name cannot be empty',
    'err.walletNameDuplicate': 'Account name already exists',

    'settings.title': 'PennyWallet Settings',
    'settings.general': 'General',
    'settings.folderName': 'Folder Name',
    'settings.folderNameDesc': 'Folder to store penny-wallet files (relative to vault root)',
    'settings.defaultWallet': 'Default Account',
    'settings.defaultWalletDesc': 'Default account selected when adding a transaction',
    'settings.decimalPlaces': 'Decimal Places',
    'settings.decimalPlacesDesc': 'Number of decimal places allowed for amounts',
    'settings.dp0': 'Integer (0 decimals)',
    'settings.dp2': '2 decimal places',
    'settings.activeWallets': 'Active Accounts',
    'settings.archivedWallets': 'Archived Accounts',
    'settings.addWallet': 'Add Account',
    'settings.walletName': 'Name',
    'settings.walletType': 'Type',
    'settings.initialBalance': 'Initial Balance',
    'settings.includeInNetAssetOn': 'Current: Included in Net Assets',
    'settings.includeInNetAssetOff': 'Current: Excluded from Net Assets',
    'settings.customCategories': 'Custom Categories',
    'settings.expenseCategories': 'Expense',
    'settings.incomeCategories': 'Income',
    'settings.addCategory': 'Add Category',
    'settings.categoryPlaceholder': 'Enter category name',

    'confirm.deleteTransaction': 'Delete this transaction? This cannot be undone.',
    'confirm.archiveWallet': 'Archive this wallet? This cannot be undone. The wallet will no longer appear in transaction forms.',
    'confirm.deleteWallet': 'Delete this wallet?',
    'confirm.unarchiveWallet': 'Unarchive this wallet?',

    'onboard.welcome': 'Welcome to PennyWallet! We recommend adding your bank accounts and credit cards.',

    'settings.noActiveWallets': 'No active wallets',
    'settings.creditDebtPrefix': 'Owed ',
    'settings.creditBalanceHint': 'Enter current outstanding debt (positive). e.g. owe 3,000 → enter 3000',
    'settings.cashBankBalanceHint': 'Enter current actual balance (must be ≥ 0)',

    'notice.walletAdded': '✓ Account "{name}" added',
    'notice.transactionDeleted': '✓ Transaction deleted',
    'notice.transactionAdded': '✓ Transaction added',
    'notice.transactionUpdated': '✓ Transaction updated',
    'notice.loadFailed': 'PennyWallet failed to load. Please check plugin settings.',

    'err.cashBankNegativeBalance': 'Cash and bank balance cannot be negative',
    'err.creditNegativeBalance': 'Credit card balance cannot be negative, enter positive debt amount',
    'err.creditNegativeBalanceShort': 'Enter positive amount for credit card debt',
    'err.categoryExists': 'Category already exists',
    'err.categoryExistsInOtherList': 'This category already exists in the other list',
    'err.invalidDate': 'Invalid date',

    'ui.unarchive': 'Unarchive',

    // Asset view
    'asset.title': 'Assets',
    'ui.asset': 'Assets',
    'ui.overview': 'Overview',
    'asset.netAssetTrend': 'Net Asset Trend',
    'asset.savingsRate': 'Savings Rate',
  },
} as const

type TranslationKey = keyof typeof translations['en']

let currentLocale: Locale = 'zh-TW'

const LOCALE_TAGS: Record<Locale, string> = {
  'zh-TW': 'zh-TW',
  en: 'en-US',
}

export function detectLocale(): Locale {
  try {
    // Obsidian exposes moment with locale set
    const lang = (window as Window & { moment?: { locale?: () => string } }).moment?.locale?.() ?? ''
    if (lang.startsWith('zh')) return 'zh-TW'
  } catch {
    // ignore
  }
  return 'en'
}

export function setLocale(locale: Locale): void {
  currentLocale = locale
}

export function t(key: TranslationKey): string {
  const dict = translations[currentLocale] as Record<string, string>
  return dict[key] ?? (translations['en'] as Record<string, string>)[key] ?? key
}

/** t() with variable substitution. e.g. tn('notice.walletAdded', { name: '現金' }) */
export function tn(key: TranslationKey, vars: Record<string, string>): string {
  let str = t(key)
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{${k}}`, v)
  }
  return str
}

function parseYearMonth(yearMonth: string): { year: string; month: string; monthPadded: string; date: Date } | null {
  const match = yearMonth.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null

  const [, year, monthPadded] = match
  const monthNumber = Number(monthPadded)
  if (monthNumber < 1 || monthNumber > 12) return null

  return {
    year,
    month: String(monthNumber),
    monthPadded,
    date: new Date(Number(year), monthNumber - 1, 1),
  }
}

function getShortMonthName(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[currentLocale], { month: 'short' }).format(date)
}

export function formatYearMonth(yearMonth: string, style: 'numeric' | 'short' = 'numeric'): string {
  const parsed = parseYearMonth(yearMonth)
  if (!parsed) return yearMonth

  const vars = {
    year: parsed.year,
    month: parsed.month,
    monthPadded: parsed.monthPadded,
    monthName: getShortMonthName(parsed.date),
  }

  return style === 'short'
    ? tn('date.yearMonthShort', vars)
    : tn('date.yearMonthNumeric', vars)
}

export function formatMonthLabel(yearMonth: string): string {
  const parsed = parseYearMonth(yearMonth)
  if (!parsed) return yearMonth

  return tn('date.monthLabel', {
    year: parsed.year,
    month: parsed.month,
    monthPadded: parsed.monthPadded,
    monthName: getShortMonthName(parsed.date),
  })
}

/** Translate a category value from markdown (key or raw string) to display label */
export function translateCategory(value: string): string {
  const key = `cat.${value}` as TranslationKey
  const dict = translations[currentLocale] as Record<string, string>
  return dict[key] ?? value  // custom categories return as-is
}

export function initI18n(): void {
  currentLocale = detectLocale()
}
