import { describe, it, expect } from 'vitest'
import { WalletFile, parseMonthFile, parseFrontmatter } from '../../src/io/WalletFile'
import { DEFAULT_CONFIG } from '../../src/types'
import { createMockApp } from '../helpers/mockApp'
import type { Transaction } from '../../src/types'

// ── Setup helper ──────────────────────────────────────────────────────────────

async function makeWalletFile(initialFiles: Record<string, string> = {}) {
  const config = { ...DEFAULT_CONFIG, folderName: 'Ledgers' }
  const files = { '.penny-wallet.json': JSON.stringify(config), ...initialFiles }
  const { app, store } = createMockApp(files)
  const wf = new WalletFile(app)
  await wf.loadConfig()
  return { wf, store }
}

const EXPENSE: Transaction = {
  date: '04/15',
  type: 'expense',
  wallet: 'Default Wallet',
  category: 'food',
  note: 'Lunch',
  amount: 150,
}

// ── readMonth ─────────────────────────────────────────────────────────────────

describe('readMonth', () => {
  it('returns empty array for a month with no file', async () => {
    const { wf } = await makeWalletFile()
    const txs = await wf.readMonth('2026-04')
    expect(txs).toEqual([])
  })

  it('returns transactions from an existing file', async () => {
    const { wf } = await makeWalletFile()
    await wf.writeTransaction(EXPENSE, '2026-04')
    const txs = await wf.readMonth('2026-04')
    expect(txs).toHaveLength(1)
    expect(txs[0].amount).toBe(150)
  })
})

// ── writeTransaction ──────────────────────────────────────────────────────────

describe('writeTransaction', () => {
  it('creates a month file with 1 row on empty month', async () => {
    const { wf, store } = await makeWalletFile()
    await wf.writeTransaction(EXPENSE, '2026-04')

    expect(store.has('Ledgers/2026-04.md')).toBe(true)
    const txs = parseMonthFile(store.get('Ledgers/2026-04.md')!)
    expect(txs).toHaveLength(1)
    expect(txs[0].note).toBe('Lunch')
  })

  it('sorts newer dates first', async () => {
    const { wf, store } = await makeWalletFile()
    const early: Transaction = { ...EXPENSE, date: '04/01', note: 'Early' }
    const late: Transaction = { ...EXPENSE, date: '04/30', note: 'Late' }

    await wf.writeTransaction(early, '2026-04')
    await wf.writeTransaction(late, '2026-04')

    const txs = parseMonthFile(store.get('Ledgers/2026-04.md')!)
    expect(txs[0].note).toBe('Late')
    expect(txs[1].note).toBe('Early')
  })

  it('updates frontmatter expense total', async () => {
    const { wf, store } = await makeWalletFile()
    await wf.writeTransaction(EXPENSE, '2026-04') // 150

    const content = store.get('Ledgers/2026-04.md')!
    const fm = parseFrontmatter(content)
    expect(fm.expense).toBe(150)
    expect(fm.income).toBe(0)
  })

  it('updates frontmatter income total for income transaction', async () => {
    const { wf, store } = await makeWalletFile()
    const income: Transaction = { date: '04/10', type: 'income', wallet: 'Default Wallet', category: 'salary', note: 'Salary', amount: 50000 }
    await wf.writeTransaction(income, '2026-04')

    const fm = parseFrontmatter(store.get('Ledgers/2026-04.md')!)
    expect(fm.income).toBe(50000)
    expect(fm.expense).toBe(0)
  })
})

// ── updateTransaction ─────────────────────────────────────────────────────────

describe('updateTransaction', () => {
  it('replaces a transaction in-place (same month)', async () => {
    const { wf, store } = await makeWalletFile()
    await wf.writeTransaction(EXPENSE, '2026-04')

    const updated: Transaction = { ...EXPENSE, amount: 999, note: 'Dinner' }
    await wf.updateTransaction(EXPENSE, '2026-04', updated, '2026-04')

    const txs = parseMonthFile(store.get('Ledgers/2026-04.md')!)
    expect(txs).toHaveLength(1)
    expect(txs[0].amount).toBe(999)
    expect(txs[0].note).toBe('Dinner')
  })

  it('updates frontmatter after same-month edit', async () => {
    const { wf, store } = await makeWalletFile()
    await wf.writeTransaction(EXPENSE, '2026-04') // expense: 150

    const updated: Transaction = { ...EXPENSE, amount: 300 }
    await wf.updateTransaction(EXPENSE, '2026-04', updated, '2026-04')

    const fm = parseFrontmatter(store.get('Ledgers/2026-04.md')!)
    expect(fm.expense).toBe(300)
  })

  it('moves transaction cross-month (deletes from old, inserts in new)', async () => {
    const { wf, store } = await makeWalletFile()
    const marchTx: Transaction = { ...EXPENSE, date: '03/15' }
    await wf.writeTransaction(marchTx, '2026-03')

    const updated: Transaction = { ...marchTx, date: '04/15' }
    await wf.updateTransaction(marchTx, '2026-03', updated, '2026-04')

    // Old month should have empty table body
    const oldTxs = parseMonthFile(store.get('Ledgers/2026-03.md')!)
    expect(oldTxs).toHaveLength(0)

    // New month should have the moved transaction
    const newTxs = parseMonthFile(store.get('Ledgers/2026-04.md')!)
    expect(newTxs).toHaveLength(1)
    expect(newTxs[0].note).toBe('Lunch')
  })
})

// ── deleteTransaction ─────────────────────────────────────────────────────────

describe('deleteTransaction', () => {
  it('removes the transaction; file still exists with empty table body', async () => {
    const { wf, store } = await makeWalletFile()
    await wf.writeTransaction(EXPENSE, '2026-04')
    await wf.deleteTransaction(EXPENSE, '2026-04')

    expect(store.has('Ledgers/2026-04.md')).toBe(true)
    const txs = parseMonthFile(store.get('Ledgers/2026-04.md')!)
    expect(txs).toHaveLength(0)
  })

  it('updates frontmatter after deletion', async () => {
    const { wf, store } = await makeWalletFile()
    await wf.writeTransaction(EXPENSE, '2026-04')
    await wf.deleteTransaction(EXPENSE, '2026-04')

    const fm = parseFrontmatter(store.get('Ledgers/2026-04.md')!)
    expect(fm.expense).toBe(0)
  })
})

// ── getNetAssetTimeline ───────────────────────────────────────────────────────

describe('getNetAssetTimeline', () => {
  it('returns net asset at each target month', async () => {
    // Config: one bank wallet, initialBalance = 0
    const config = {
      ...DEFAULT_CONFIG,
      folderName: 'Ledgers',
      wallets: [{ name: 'Bank', type: 'bank' as const, initialBalance: 0, status: 'active' as const, includeInNetAsset: true }],
    }
    const { app } = createMockApp({ '.penny-wallet.json': JSON.stringify(config) })
    const wf = new WalletFile(app)
    await wf.loadConfig()

    // Write income in Jan, expense in Feb
    await wf.writeTransaction({ date: '01/15', type: 'income', wallet: 'Bank', category: 'salary', note: '', amount: 1000 }, '2026-01')
    await wf.writeTransaction({ date: '02/10', type: 'expense', wallet: 'Bank', category: 'food', note: '', amount: 200 }, '2026-02')

    const timeline = await wf.getNetAssetTimeline(['2026-01', '2026-02'])

    expect(timeline.get('2026-01')).toBe(1000)   // after Jan income
    expect(timeline.get('2026-02')).toBe(800)    // after Feb expense
  })

  it('returns empty map for no relevant months', async () => {
    const { wf } = await makeWalletFile()
    const timeline = await wf.getNetAssetTimeline(['2026-01'])
    expect(timeline.size).toBe(0)
  })
})

// ── calculateWalletData ───────────────────────────────────────────────────────

describe('calculateWalletData', () => {
  it('reports wallets that appear in transactions', async () => {
    const { wf } = await makeWalletFile()
    await wf.writeTransaction(EXPENSE, '2026-04')

    const { walletsWithTransactions } = await wf.calculateWalletData()
    expect(walletsWithTransactions.has('Default Wallet')).toBe(true)
  })

  it('reports fromWallet and toWallet for transfer', async () => {
    const { wf } = await makeWalletFile()
    const transfer: Transaction = { date: '04/01', type: 'transfer', fromWallet: 'Bank', toWallet: 'Cash', note: '', amount: 500 }
    await wf.writeTransaction(transfer, '2026-04')

    const { walletsWithTransactions } = await wf.calculateWalletData()
    expect(walletsWithTransactions.has('Bank')).toBe(true)
    expect(walletsWithTransactions.has('Cash')).toBe(true)
  })
})
