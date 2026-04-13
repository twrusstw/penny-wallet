import { describe, it, expect } from 'vitest'
import { WalletFile } from '../../src/io/WalletFile'
import { createMockApp } from '../helpers/mockApp'
import type { Wallet, Transaction, WalletBalance } from '../../src/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWalletFile(wallets: Wallet[]): WalletFile {
  const { app } = createMockApp()
  const wf = new WalletFile(app)
  wf.updateConfig({ wallets })
  return wf
}

const CASH: Wallet = { name: 'Cash', type: 'cash', initialBalance: 1000, status: 'active', includeInNetAsset: true }
const BANK: Wallet = { name: 'Bank', type: 'bank', initialBalance: 5000, status: 'active', includeInNetAsset: true }
const CARD: Wallet = { name: 'Card', type: 'creditCard', initialBalance: 0, status: 'active', includeInNetAsset: true }

// ── computeWalletBalances ─────────────────────────────────────────────────────

describe('computeWalletBalances', () => {
  it('expense on bank reduces balance', () => {
    const wf = makeWalletFile([BANK])
    const txs: Transaction[] = [{ date: '04/01', type: 'expense', wallet: 'Bank', category: 'food', note: '', amount: 200 }]
    const result = wf.computeWalletBalances(txs)
    expect(result[0].balance).toBe(4800)
  })

  it('expense on creditCard increases debt (balance increases)', () => {
    const wf = makeWalletFile([CARD])
    const txs: Transaction[] = [{ date: '04/01', type: 'expense', wallet: 'Card', category: 'food', note: '', amount: 300 }]
    const result = wf.computeWalletBalances(txs)
    expect(result[0].balance).toBe(300)
  })

  it('income on bank increases balance', () => {
    const wf = makeWalletFile([BANK])
    const txs: Transaction[] = [{ date: '04/01', type: 'income', wallet: 'Bank', category: 'salary', note: '', amount: 10000 }]
    const result = wf.computeWalletBalances(txs)
    expect(result[0].balance).toBe(15000)
  })

  it('transfer: fromWallet decreases, toWallet increases', () => {
    const wf = makeWalletFile([BANK, CASH])
    const txs: Transaction[] = [{ date: '04/01', type: 'transfer', fromWallet: 'Bank', toWallet: 'Cash', note: '', amount: 500 }]
    const result = wf.computeWalletBalances(txs)
    const bank = result.find(r => r.wallet.name === 'Bank')!
    const cash = result.find(r => r.wallet.name === 'Cash')!
    expect(bank.balance).toBe(4500)
    expect(cash.balance).toBe(1500)
  })

  it('credit_card_payment (was repayment): bank decreases, creditCard debt decreases', () => {
    const wf = makeWalletFile([BANK, CARD])
    // First create some credit card debt
    const txs: Transaction[] = [
      { date: '04/01', type: 'expense', wallet: 'Card', category: 'food', note: '', amount: 500 },
      { date: '04/15', type: 'transfer', category: 'credit_card_payment', fromWallet: 'Bank', toWallet: 'Card', note: '', amount: 500 },
    ]
    const result = wf.computeWalletBalances(txs)
    const bank = result.find(r => r.wallet.name === 'Bank')!
    const card = result.find(r => r.wallet.name === 'Card')!
    expect(bank.balance).toBe(4500)   // 5000 - 500
    expect(card.balance).toBe(0)      // 0 + 500 - 500
  })

  it('credit_card_refund: creditCard debt decreases, no other wallet affected', () => {
    const wf = makeWalletFile([BANK, CARD])
    const txs: Transaction[] = [
      { date: '04/01', type: 'expense', wallet: 'Card', category: 'shopping', note: '', amount: 300 },
      { date: '04/02', type: 'transfer', category: 'credit_card_refund', fromWallet: 'Card', toWallet: 'Card', note: '', amount: 100 },
    ]
    const result = wf.computeWalletBalances(txs)
    const bank = result.find(r => r.wallet.name === 'Bank')!
    const card = result.find(r => r.wallet.name === 'Card')!
    expect(bank.balance).toBe(5000)   // unaffected
    expect(card.balance).toBe(200)    // 300 - 100
  })

  it('unknown wallet in transaction is silently ignored', () => {
    const wf = makeWalletFile([BANK])
    const txs: Transaction[] = [{ date: '04/01', type: 'expense', wallet: 'Ghost', category: 'food', note: '', amount: 100 }]
    const result = wf.computeWalletBalances(txs)
    expect(result[0].balance).toBe(5000) // unaffected
  })

  it('accumulates multiple expenses on the same wallet', () => {
    const wf = makeWalletFile([BANK])
    const txs: Transaction[] = [
      { date: '04/01', type: 'expense', wallet: 'Bank', category: 'food', note: '', amount: 100 },
      { date: '04/02', type: 'expense', wallet: 'Bank', category: 'transport', note: '', amount: 200 },
    ]
    const result = wf.computeWalletBalances(txs)
    expect(result[0].balance).toBe(4700) // 5000 - 100 - 200
  })

  it('preserves wallet order from config', () => {
    const wf = makeWalletFile([CARD, BANK, CASH])
    const result = wf.computeWalletBalances([])
    expect(result.map(r => r.wallet.type)).toEqual(['creditCard', 'bank', 'cash'])
  })
})

// ── computeNetAsset ───────────────────────────────────────────────────────────

describe('computeNetAsset', () => {
  it('sums bank and cash balances', () => {
    const wf = makeWalletFile([BANK, CASH])
    const balances: WalletBalance[] = [
      { wallet: BANK, balance: 5000 },
      { wallet: CASH, balance: 1000 },
    ]
    expect(wf.computeNetAsset(balances)).toBe(6000)
  })

  it('subtracts creditCard debt from net asset', () => {
    const wf = makeWalletFile([BANK, CARD])
    const balances: WalletBalance[] = [
      { wallet: BANK, balance: 5000 },
      { wallet: CARD, balance: 300 }, // 300 in debt
    ]
    expect(wf.computeNetAsset(balances)).toBe(4700)
  })

  it('excludes wallet with includeInNetAsset: false', () => {
    const archived: Wallet = { ...BANK, name: 'OldBank', includeInNetAsset: false }
    const wf = makeWalletFile([CASH, archived])
    const balances: WalletBalance[] = [
      { wallet: CASH, balance: 1000 },
      { wallet: archived, balance: 9999 }, // should be excluded
    ]
    expect(wf.computeNetAsset(balances)).toBe(1000)
  })

  it('excludes creditCard with includeInNetAsset: false', () => {
    const hiddenCard: Wallet = { ...CARD, name: 'OldCard', includeInNetAsset: false }
    const wf = makeWalletFile([BANK, hiddenCard])
    const balances: WalletBalance[] = [
      { wallet: BANK, balance: 5000 },
      { wallet: hiddenCard, balance: 800 }, // should be excluded, not subtracted
    ]
    expect(wf.computeNetAsset(balances)).toBe(5000)
  })

  it('returns 0 for empty balances', () => {
    const wf = makeWalletFile([])
    expect(wf.computeNetAsset([])).toBe(0)
  })
})

// ── computeSummary ────────────────────────────────────────────────────────────

describe('computeSummary', () => {
  it('sums only expense transactions', () => {
    const wf = makeWalletFile([])
    const txs: Transaction[] = [
      { date: '04/01', type: 'expense', wallet: 'Cash', category: 'food', note: '', amount: 200 },
      { date: '04/02', type: 'expense', wallet: 'Cash', category: 'transport', note: '', amount: 50 },
    ]
    expect(wf.computeSummary(txs)).toEqual({ income: 0, expense: 250, netAsset: 0 })
  })

  it('sums only income transactions', () => {
    const wf = makeWalletFile([])
    const txs: Transaction[] = [
      { date: '04/01', type: 'income', wallet: 'Bank', category: 'salary', note: '', amount: 50000 },
    ]
    expect(wf.computeSummary(txs)).toEqual({ income: 50000, expense: 0, netAsset: 0 })
  })

  it('excludes transfer from totals', () => {
    const wf = makeWalletFile([])
    const txs: Transaction[] = [
      { date: '04/01', type: 'transfer', fromWallet: 'Bank', toWallet: 'Cash', note: '', amount: 1000 },
      { date: '04/02', type: 'transfer', category: 'credit_card_payment', fromWallet: 'Bank', toWallet: 'Card', note: '', amount: 500 },
    ]
    expect(wf.computeSummary(txs)).toEqual({ income: 0, expense: 0, netAsset: 0 })
  })

  it('always returns netAsset: 0', () => {
    const wf = makeWalletFile([])
    const { netAsset } = wf.computeSummary([])
    expect(netAsset).toBe(0)
  })
})

// ── groupByCategory ───────────────────────────────────────────────────────────

describe('groupByCategory', () => {
  const wf = makeWalletFile([])

  it('sums amounts for the same category', () => {
    const txs: Transaction[] = [
      { date: '04/01', type: 'expense', wallet: 'Cash', category: 'food', note: '', amount: 100 },
      { date: '04/02', type: 'expense', wallet: 'Cash', category: 'food', note: '', amount: 200 },
    ]
    const map = wf.groupByCategory(txs, 'expense')
    expect(map.get('food')).toBe(300)
  })

  it('falls back to "" for undefined category', () => {
    const txs: Transaction[] = [
      { date: '04/01', type: 'expense', wallet: 'Cash', note: '', amount: 50 },
    ]
    const map = wf.groupByCategory(txs, 'expense')
    expect(map.get('')).toBe(50)
  })

  it('excludes transactions of the wrong type', () => {
    const txs: Transaction[] = [
      { date: '04/01', type: 'income', wallet: 'Bank', category: 'salary', note: '', amount: 10000 },
      { date: '04/02', type: 'expense', wallet: 'Cash', category: 'food', note: '', amount: 100 },
    ]
    const map = wf.groupByCategory(txs, 'expense')
    expect(map.has('salary')).toBe(false)
    expect(map.get('food')).toBe(100)
  })

  it('returns empty map for no matching transactions', () => {
    const txs: Transaction[] = [
      { date: '04/01', type: 'income', wallet: 'Bank', category: 'salary', note: '', amount: 1000 },
    ]
    const map = wf.groupByCategory(txs, 'expense')
    expect(map.size).toBe(0)
  })
})
