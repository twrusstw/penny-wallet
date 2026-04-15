export type TransactionType = 'expense' | 'income' | 'transfer'
export type WalletType = 'cash' | 'bank' | 'creditCard'

export interface Transaction {
  date: string        // MM/DD format as stored in markdown (e.g. "04/03")
  type: TransactionType
  wallet?: string     // expense / income
  fromWallet?: string // transfer / repayment
  toWallet?: string   // transfer / repayment
  category?: string   // expense / income; default categories stored as key (e.g. "food"), custom as raw string
  note: string
  tags?: string[]
  amount: number
  createdAt?: string  // ISO 8601 timestamp; absent in data written before this field was added
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

export interface OptionsListGroup {
  default: string[]   // built-in, immutable
  custom: string[]    // user-defined
}

export interface PennyWalletOptions {
  types: OptionsListGroup
  categories: {
    expense: OptionsListGroup
    income: OptionsListGroup
    transfer: OptionsListGroup
  }
}

export interface PennyWalletConfig {
  wallets: Wallet[]
  defaultWallet: string
  folderName: string
  decimalPlaces: 0 | 2
  options: PennyWalletOptions
  tags: string[]
}

export interface TransactionModalParams {
  type?: TransactionType
  amount?: number
  note?: string
  tags?: string[]
  category?: string
  wallet?: string
  fromWallet?: string
  toWallet?: string
  date?: string  // yyyy-mm-dd
}

// Default category keys
export const DEFAULT_EXPENSE_CATEGORIES = [
  'food', 'clothing', 'housing', 'transport', 'education',
  'entertainment', 'shopping', 'medical', 'cash_expense',
  'insurance', 'fees', 'tax',
] as const

export const DEFAULT_INCOME_CATEGORIES = [
  'salary', 'interest', 'side_income', 'bonus', 'lottery',
  'rent', 'cashback', 'dividend', 'investment_profit',
  'insurance_income', 'pension',
] as const

export const DEFAULT_TRANSFER_CATEGORIES = [
  'account_transfer', 'credit_card_payment',
  'credit_card_refund', 'investment_trade',
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
  defaultWallet: 'Default Wallet',
  folderName: 'PennyWallet',
  decimalPlaces: 0,
  options: {
    types: {
      default: ['expense', 'income', 'transfer'],
      custom: [],
    },
    categories: {
      expense: {
        default: [...DEFAULT_EXPENSE_CATEGORIES],
        custom: [],
      },
      income: {
        default: [...DEFAULT_INCOME_CATEGORIES],
        custom: [],
      },
      transfer: {
        default: [...DEFAULT_TRANSFER_CATEGORIES],
        custom: [],
      },
    },
  },
  tags: [],
}
