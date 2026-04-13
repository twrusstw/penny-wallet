import { describe, it, expect } from 'vitest'
import {
  parseRow,
  parseMonthFile,
  parseFrontmatter,
  buildMonthContent,
} from '../../src/io/WalletFile'
import type { Transaction, MonthSummary } from '../../src/types'

// ── parseRow ──────────────────────────────────────────────────────────────────

describe('parseRow', () => {
  it('parses a valid expense row', () => {
    const line = '| 04/03 | expense | 玉山信用卡 | - | - | food | 午餐 | 250 |'
    const tx = parseRow(line)
    expect(tx).toEqual<Transaction>({
      date: '04/03',
      type: 'expense',
      wallet: '玉山信用卡',
      fromWallet: undefined,
      toWallet: undefined,
      category: 'food',
      note: '午餐',
      amount: 250,
    })
  })

  it('parses a valid transfer row (dash fields become undefined)', () => {
    const line = '| 04/30 | transfer | - | 玉山銀行 | 現金 | - | 提款 | 1000 |'
    const tx = parseRow(line)
    expect(tx).toEqual<Transaction>({
      date: '04/30',
      type: 'transfer',
      wallet: undefined,
      fromWallet: '玉山銀行',
      toWallet: '現金',
      category: undefined,
      note: '提款',
      amount: 1000,
    })
  })

  it('maps legacy type "payment" → transfer + credit_card_payment', () => {
    const line = '| 04/30 | payment | - | 玉山銀行 | 玉山信用卡 | - | 還款 | 5000 |'
    const tx = parseRow(line)
    expect(tx?.type).toBe('transfer')
    expect(tx?.category).toBe('credit_card_payment')
  })

  it('maps legacy type "repayment" → transfer + credit_card_payment', () => {
    const line = '| 04/30 | repayment | - | 玉山銀行 | 玉山信用卡 | - | 還款 | 5000 |'
    const tx = parseRow(line)
    expect(tx?.type).toBe('transfer')
    expect(tx?.category).toBe('credit_card_payment')
  })

  it('note dash → empty string', () => {
    const line = '| 04/03 | expense | 現金 | - | - | food | - | 100 |'
    expect(parseRow(line)?.note).toBe('')
  })

  it('returns null when column count < 8', () => {
    const line = '| 04/03 | expense | 現金 | food | 100 |'
    expect(parseRow(line)).toBeNull()
  })

  it('returns null when amount is not a number', () => {
    const line = '| 04/03 | expense | 現金 | - | - | food | 午餐 | abc |'
    expect(parseRow(line)).toBeNull()
  })

  it('parses decimal amounts', () => {
    const line = '| 04/03 | expense | 現金 | - | - | food | 咖啡 | 49.5 |'
    expect(parseRow(line)?.amount).toBe(49.5)
  })
})

// ── parseMonthFile ────────────────────────────────────────────────────────────

describe('parseMonthFile', () => {
  const sampleContent = `---
income: 60000
expense: 250
netAsset: 0
---

## 2026-04

| Date | Type | Wallet | From | To | Category | Note | Amount |
|------|------|--------|------|----|----------|------|--------|
| 04/03 | expense | 現金 | - | - | food | 午餐 | 250 |
| 04/10 | income | 玉山銀行 | - | - | salary | 薪資 | 60000 |
`

  it('returns all transactions from a well-formed file', () => {
    const txs = parseMonthFile(sampleContent)
    expect(txs).toHaveLength(2)
    expect(txs[0].type).toBe('expense')
    expect(txs[1].type).toBe('income')
  })

  it('recognises Chinese table header (| 日期)', () => {
    const content = `## 2026-04\n\n| 日期 | 類型 | 帳戶 | 從 | 到 | 分類 | 備註 | 金額 |\n|------|------|--------|------|----|----------|------|--------|\n| 04/03 | expense | 現金 | - | - | food | 午餐 | 100 |\n`
    const txs = parseMonthFile(content)
    expect(txs).toHaveLength(1)
  })

  it('returns empty array for content with no table', () => {
    expect(parseMonthFile('# No table here\n')).toEqual([])
  })

  it('stops parsing on blank line after table', () => {
    const content = `| Date | Type | Wallet | From | To | Category | Note | Amount |
|------|------|--------|------|----|----------|------|--------|
| 04/01 | expense | 現金 | - | - | food | a | 10 |

| Date | Type | Wallet | From | To | Category | Note | Amount |
|------|------|--------|------|----|----------|------|--------|
| 04/02 | expense | 現金 | - | - | food | b | 20 |
`
    // Only the first table block should be parsed (blank line terminates)
    const txs = parseMonthFile(content)
    expect(txs).toHaveLength(1)
    expect(txs[0].note).toBe('a')
  })
})

// ── parseFrontmatter ──────────────────────────────────────────────────────────

describe('parseFrontmatter', () => {
  it('parses valid frontmatter', () => {
    const content = '---\nincome: 60000\nexpense: 12450\nnetAsset: 0\n---\n\n## body'
    expect(parseFrontmatter(content)).toEqual({ income: 60000, expense: 12450, netAsset: 0 })
  })

  it('returns empty object when no frontmatter', () => {
    expect(parseFrontmatter('## 2026-04\n\nsome content')).toEqual({})
  })

  it('handles partial frontmatter (missing keys are undefined)', () => {
    const content = '---\nincome: 1000\n---\n'
    const fm = parseFrontmatter(content)
    expect(fm.income).toBe(1000)
    expect(fm.expense).toBeUndefined()
    expect(fm.netAsset).toBeUndefined()
  })
})

// ── buildMonthContent ─────────────────────────────────────────────────────────

describe('buildMonthContent', () => {
  const summary: MonthSummary = { income: 60000, expense: 250, netAsset: 0 }

  it('contains frontmatter with correct values', () => {
    const content = buildMonthContent('2026-04', [], summary)
    expect(content).toContain('income: 60000')
    expect(content).toContain('expense: 250')
    expect(content).toContain('netAsset: 0')
  })

  it('contains the month heading', () => {
    const content = buildMonthContent('2026-04', [], summary)
    expect(content).toContain('## 2026-04')
  })

  it('empty transactions → table header only, no data rows', () => {
    const content = buildMonthContent('2026-04', [], summary)
    const lines = content.split('\n').filter(l => l.startsWith('|') && !l.startsWith('|---'))
    // Only the header row
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('Date')
  })

  it('includes formatted transaction rows', () => {
    const tx: Transaction = {
      date: '04/03',
      type: 'expense',
      wallet: '現金',
      category: 'food',
      note: '午餐',
      amount: 250,
    }
    const content = buildMonthContent('2026-04', [tx], summary)
    expect(content).toContain('| 04/03 | expense | 現金 |')
    expect(content).toContain('| 250 |')
  })

  it('round-trips: buildMonthContent → parseMonthFile', () => {
    const txs: Transaction[] = [
      { date: '04/03', type: 'expense', wallet: '現金', category: 'food', note: '午餐', amount: 250 },
      { date: '04/10', type: 'income', wallet: '銀行', category: 'salary', note: '', amount: 60000 },
    ]
    const content = buildMonthContent('2026-04', txs, summary)
    const parsed = parseMonthFile(content)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].amount).toBe(250)
    expect(parsed[1].amount).toBe(60000)
  })
})
