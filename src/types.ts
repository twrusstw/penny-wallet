export type TransactionType = 'expense' | 'income' | 'transfer' | 'repayment'
export type WalletType = 'cash' | 'bank' | 'creditCard'

export interface Transaction {
  date: string        // MM/DD format as stored in markdown (e.g. "04/03")
  type: TransactionType
  wallet?: string     // expense / income
  fromWallet?: string // transfer / repayment
  toWallet?: string   // transfer / repayment
  category?: string   // expense / income; default categories stored as key (e.g. "food"), custom as raw string
  note: string
  amount: number
}

export interface Wallet {
  name: string
  type: WalletType
  initialBalance: number  // creditCard: positive number = debt amount
  status: 'active' | 'archived'
  includeInNetAsset: boolean  // active wallets always true; archived wallets can be toggled
}

export interface MonthSummary {
  income: number
  expense: number
  netAsset: number
}

export interface WalletBalance {
  wallet: Wallet
  balance: number   // creditCard: positive = debt owed (displayed as negative in net asset)
}

export interface PennyWalletConfig {
  wallets: Wallet[]
  customExpenseCategories: string[]
  customIncomeCategories: string[]
  defaultWallet: string
  folderName: string
  decimalPlaces: 0 | 2
}

export interface TransactionModalParams {
  type?: TransactionType
  amount?: number
  note?: string
  category?: string
  wallet?: string
  fromWallet?: string
  toWallet?: string
  date?: string  // yyyy-mm-dd
}

// Default category keys
export const DEFAULT_EXPENSE_CATEGORIES = [
  'food', 'transport', 'shopping', 'entertainment', 'medical', 'housing', 'other'
] as const

export const DEFAULT_INCOME_CATEGORIES = [
  'salary', 'bonus', 'side_income', 'other'
] as const

export const DEFAULT_CONFIG: PennyWalletConfig = {
  wallets: [
    {
      name: 'Default Wallet',
      type: 'cash',
      initialBalance: 0,
      status: 'active',
      includeInNetAsset: true,
    }
  ],
  customExpenseCategories: [],
  customIncomeCategories: [],
  defaultWallet: 'Default Wallet',
  folderName: 'PennyWallet',
  decimalPlaces: 0,
}
