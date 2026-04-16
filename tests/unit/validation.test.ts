import { describe, it, expect } from 'vitest'
import {
  detectFrontmatterIssues,
  detectOrphanedWallets,
  WalletFile,
} from '../../src/io/WalletFile'
import type { Transaction, Wallet } from '../../src/types'
import type { App } from 'obsidian'

const makeExpense = (wallet: string, amount: number): Transaction => ({
  date: '04/01', type: 'expense', wallet, note: '', amount,
})
const makeTransfer = (from: string, to: string, amount: number): Transaction => ({
  date: '04/01', type: 'transfer', fromWallet: from, toWallet: to, note: '', amount,
})
const makeWallet = (name: string, status: 'active' | 'archived' = 'active'): Wallet => ({
  name, type: 'bank', initialBalance: 0, status, includeInNetAsset: true,
})

// ── detectFrontmatterIssues ──────────────────────────────────────────────────

describe('detectFrontmatterIssues', () => {
  it('returns empty when frontmatter matches transactions', () => {
    const txs: Transaction[] = [
      makeExpense('A', 100),
      { date: '04/02', type: 'income', wallet: 'A', note: '', amount: 200 },
    ]
    const issues = detectFrontmatterIssues('2026-04', txs, { income: 200, expense: 100, })
    expect(issues).toHaveLength(0)
  })

  it('returns issue when stored income differs from actual', () => {
    const txs: Transaction[] = [
      { date: '04/02', type: 'income', wallet: 'A', note: '', amount: 500 },
    ]
    const issues = detectFrontmatterIssues('2026-04', txs, { income: 300, expense: 0, })
    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('frontmatter')
    if (issues[0].type === 'frontmatter') {
      expect(issues[0].storedIncome).toBe(300)
      expect(issues[0].actualIncome).toBe(500)
    }
  })

  it('returns issue when stored expense differs from actual', () => {
    const txs: Transaction[] = [makeExpense('A', 200)]
    const issues = detectFrontmatterIssues('2026-04', txs, { income: 0, expense: 999, })
    expect(issues).toHaveLength(1)
  })

  it('ignores transfer transactions in income/expense totals', () => {
    const txs: Transaction[] = [makeTransfer('A', 'B', 1000)]
    const issues = detectFrontmatterIssues('2026-04', txs, { income: 0, expense: 0, })
    expect(issues).toHaveLength(0)
  })
})

// ── detectOrphanedWallets ────────────────────────────────────────────────────

describe('detectOrphanedWallets', () => {
  it('returns empty when all wallets are known', () => {
    const wallets = [makeWallet('A'), makeWallet('B', 'archived')]
    const monthData = new Map([['2026-04', [makeExpense('A', 100), makeTransfer('A', 'B', 50)]]])
    const issues = detectOrphanedWallets(monthData, wallets)
    expect(issues).toHaveLength(0)
  })

  it('detects wallet not in config (active or archived)', () => {
    const wallets = [makeWallet('A')]
    const monthData = new Map([['2026-04', [makeExpense('Ghost', 100)]]])
    const issues = detectOrphanedWallets(monthData, wallets)
    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('orphanedWallet')
    if (issues[0].type === 'orphanedWallet') {
      expect(issues[0].walletName).toBe('Ghost')
      expect(issues[0].transactionCount).toBe(1)
      expect(issues[0].yearMonths).toContain('2026-04')
    }
  })

  it('counts transactions across multiple months', () => {
    const wallets = [makeWallet('A')]
    const monthData = new Map([
      ['2026-03', [makeExpense('Ghost', 50)]],
      ['2026-04', [makeExpense('Ghost', 100), makeTransfer('Ghost', 'A', 200)]],
    ])
    const issues = detectOrphanedWallets(monthData, wallets)
    expect(issues).toHaveLength(1)
    if (issues[0].type === 'orphanedWallet') {
      expect(issues[0].transactionCount).toBe(3)
      expect(issues[0].yearMonths).toEqual(['2026-03', '2026-04'])
    }
  })

  it('does not flag archived wallets as orphans', () => {
    const wallets = [makeWallet('Active'), makeWallet('Archived', 'archived')]
    const monthData = new Map([['2026-04', [makeExpense('Archived', 100)]]])
    const issues = detectOrphanedWallets(monthData, wallets)
    expect(issues).toHaveLength(0)
  })
})

// ── repairOrphanedWallet (config mutation) ───────────────────────────────────

describe('repairOrphanedWallet', () => {
  function makeApp(configJson: string) {
    const files = new Map<string, string>([['.penny-wallet.json', configJson]])
    return {
      vault: {
        getFileByPath: (p: string) => files.has(p) ? { path: p } : null,
        read: async (f: { path: string }) => files.get(f.path) ?? '',
        modify: async (f: { path: string }, content: string) => { files.set(f.path, content) },
        create: async (p: string, content: string) => { files.set(p, content) },
        adapter: {
          exists: async (p: string) => files.has(p),
          read: async (p: string) => files.get(p) ?? '',
          write: async (p: string, content: string) => { files.set(p, content) },
        },
        getFolderByPath: () => null,
        getMarkdownFiles: () => [],
      },
    } as unknown as App
  }

  const baseConfig = JSON.stringify({
    wallets: [{ name: 'A', type: 'bank', initialBalance: 0, status: 'active', includeInNetAsset: true }],
    defaultWallet: 'A',
    folderName: 'PW',
    decimalPlaces: 0,
    options: {
      types: { default: [], custom: [] },
      categories: {
        expense: { default: [], custom: [] },
        income: { default: [], custom: [] },
        transfer: { default: [], custom: [] },
      },
    },
    tags: [],
    autoValidateOnLoad: true,
  })

  it('adds orphan as archived wallet to config', async () => {
    const app = makeApp(baseConfig)
    const wf = new WalletFile(app as App)
    await wf.loadConfig()
    await wf.repairOrphanedWallet('Ghost')
    const config = wf.getConfig()
    const ghost = config.wallets.find(w => w.name === 'Ghost')
    expect(ghost).toBeDefined()
    expect(ghost?.status).toBe('archived')
    expect(ghost?.includeInNetAsset).toBe(false)
  })

  it('does not duplicate if wallet already exists', async () => {
    const app = makeApp(baseConfig)
    const wf = new WalletFile(app as App)
    await wf.loadConfig()
    await wf.repairOrphanedWallet('A')
    const count = wf.getConfig().wallets.filter(w => w.name === 'A').length
    expect(count).toBe(1)
  })
})
