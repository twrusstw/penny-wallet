import { App, TFile, normalizePath } from 'obsidian'
import {
  Transaction,
  TransactionType,
  WalletType,
  WalletBalance,
  MonthSummary,
  PennyWalletConfig,
  DEFAULT_CONFIG,
} from '../types'

const TABLE_HEADER = `| Date | Type | Wallet | From | To | Category | Note | Amount |
|------|------|--------|------|----|----------|------|--------|`

// ─── Markdown Table Parsing ───────────────────────────────────────────────────

function parseRow(line: string): Transaction | null {
  const cols = line.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1)
  if (cols.length !== 8) return null
  const [date, type, wallet, fromWallet, toWallet, category, note, amountStr] = cols
  if (!date || !type) return null

  const amount = parseFloat(amountStr)
  if (isNaN(amount)) return null

  let txType = type as TransactionType
  if ((txType as string) === 'payment') txType = 'repayment'  // backward compat

  return {
    date,
    type: txType,
    wallet: wallet === '-' ? undefined : wallet,
    fromWallet: fromWallet === '-' ? undefined : fromWallet,
    toWallet: toWallet === '-' ? undefined : toWallet,
    category: category === '-' ? undefined : category,
    note: note === '-' ? '' : note,
    amount,
  }
}

function formatRow(tx: Transaction): string {
  const d = tx.date
  const type = tx.type
  const wallet = tx.wallet ?? '-'
  const from = tx.fromWallet ?? '-'
  const to = tx.toWallet ?? '-'
  const cat = tx.category ?? '-'
  const note = tx.note || '-'
  const amount = tx.amount
  return `| ${d} | ${type} | ${wallet} | ${from} | ${to} | ${cat} | ${note} | ${amount} |`
}

function parseMonthFile(content: string): Transaction[] {
  const lines = content.split('\n')
  const transactions: Transaction[] = []
  let inTable = false

  for (const line of lines) {
    const trimmed = line.trim()
    // Match both English and Chinese table headers
    if (trimmed.startsWith('| Date') || trimmed.startsWith('| 日期')) {
      inTable = true
      continue
    }
    if (inTable && trimmed.startsWith('|---')) continue
    if (inTable && trimmed.startsWith('|')) {
      const tx = parseRow(trimmed)
      if (tx) transactions.push(tx)
    } else if (inTable && trimmed === '') {
      // empty line ends the table
      inTable = false
    }
  }
  return transactions
}

function parseFrontmatter(content: string): Partial<MonthSummary> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const fm: Record<string, number> = {}
  for (const line of match[1].split('\n')) {
    const [key, val] = line.split(':').map(s => s.trim())
    if (key && val) fm[key] = parseFloat(val)
  }
  return { income: fm['income'], expense: fm['expense'], netAsset: fm['netAsset'] }
}

function buildMonthContent(yearMonth: string, transactions: Transaction[], summary: MonthSummary): string {
  const frontmatter = `---\nincome: ${summary.income}\nexpense: ${summary.expense}\nnetAsset: ${summary.netAsset}\n---\n`
  const heading = `\n## ${yearMonth}\n\n`
  const rows = transactions.map(formatRow).join('\n')
  return frontmatter + heading + TABLE_HEADER + (rows ? '\n' + rows : '') + '\n'
}

// ─── Month arithmetic helpers ─────────────────────────────────────────────────

/** "yyyy-MM-DD" → "yyyy-mm" */
export function dateToYearMonth(date: string): string {
  return date.substring(0, 7)
}

/** "yyyy-MM-DD" → "MM/DD" (the format stored in markdown) */
export function dateToMonthDay(date: string): string {
  return date.substring(5).replace('-', '/')
}

// ─── WalletFile class ─────────────────────────────────────────────────────────

export class WalletFile {
  private app: App
  private config: PennyWalletConfig = { ...DEFAULT_CONFIG }

  constructor(app: App) {
    this.app = app
  }

  get folderName(): string {
    return this.config.folderName
  }

  // ── Config ──────────────────────────────────────────────────────────────────

  async loadConfig(): Promise<PennyWalletConfig> {
    const path = normalizePath(`${this.config.folderName}/config.json`)
    const file = this.app.vault.getAbstractFileByPath(path)

    if (!file) {
      // Vault index may be stale at startup — check the filesystem directly
      const existsOnDisk = await this.app.vault.adapter.exists(path)
      if (existsOnDisk) {
        try {
          const raw = await this.app.vault.adapter.read(path)
          this.config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
          this.migrateConfig()
        } catch {
          this.config = { ...DEFAULT_CONFIG }
        }
        return this.config
      }

      // Truly first launch: create locale-aware default config
      await this.ensureFolder()
      const cashName = this.getLocaleCashName()
      this.config = {
        ...DEFAULT_CONFIG,
        wallets: [{ ...DEFAULT_CONFIG.wallets[0], name: cashName }],
        defaultWallet: cashName,
      }
      await this.saveConfig()
      return this.config
    }

    if (file instanceof TFile) {
      try {
        const raw = await this.app.vault.read(file)
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
        this.migrateConfig()
      } catch {
        this.config = { ...DEFAULT_CONFIG }
      }
    }
    return this.config
  }

  private migrateConfig(): void {
    // Backward compat: rename old wallet type 'credit' → 'creditCard'
    if (this.config.wallets) {
      this.config.wallets = this.config.wallets.map(w =>
        (w.type as string) === 'credit' ? { ...w, type: 'creditCard' as WalletType } : w,
      )
    }
  }

  async saveConfig(): Promise<void> {
    await this.ensureFolder()
    const path = normalizePath(`${this.config.folderName}/config.json`)
    const content = JSON.stringify(this.config, null, 2)
    const file = this.app.vault.getAbstractFileByPath(path)
    if (file instanceof TFile) {
      await this.app.vault.modify(file, content)
    } else {
      try {
        await this.app.vault.create(path, content)
      } catch (e: any) {
        if (!e.message?.includes('already exists')) throw e
        // Vault index is stale; write directly via adapter
        await this.app.vault.adapter.write(path, content)
      }
    }
  }

  getConfig(): PennyWalletConfig {
    return this.config
  }

  updateConfig(patch: Partial<PennyWalletConfig>): void {
    this.config = { ...this.config, ...patch }
  }

  // ── Month file helpers ───────────────────────────────────────────────────────

  private monthFilePath(yearMonth: string): string {
    return normalizePath(`${this.config.folderName}/${yearMonth}.md`)
  }

  private async ensureFolder(): Promise<void> {
    const folder = this.config.folderName
    if (!this.app.vault.getAbstractFileByPath(folder)) {
      try {
        await this.app.vault.createFolder(folder)
      } catch (e: any) {
        // Ignore "Folder already exists" error from race condition
        if (!e.message?.includes('already exists')) {
          throw e
        }
      }
    }
  }

  private async readMonthFile(yearMonth: string): Promise<string | null> {
    const path = this.monthFilePath(yearMonth)
    const file = this.app.vault.getAbstractFileByPath(path)
    if (file instanceof TFile) {
      return await this.app.vault.read(file)
    }
    return null
  }

  private async writeMonthFile(yearMonth: string, content: string): Promise<void> {
    await this.ensureFolder()
    const path = this.monthFilePath(yearMonth)
    const file = this.app.vault.getAbstractFileByPath(path)
    if (file instanceof TFile) {
      await this.app.vault.modify(file, content)
    } else {
      try {
        await this.app.vault.create(path, content)
      } catch (e: any) {
        // Ignore "File already exists" error from race condition
        if (!e.message?.includes('already exists')) {
          throw e
        }
        // File was created by another process; try to modify it
        const retryFile = this.app.vault.getAbstractFileByPath(path)
        if (retryFile instanceof TFile) {
          await this.app.vault.modify(retryFile, content)
        }
      }
    }
  }

  // ── Read Transactions ────────────────────────────────────────────────────────

  async readMonth(yearMonth: string): Promise<Transaction[]> {
    const content = await this.readMonthFile(yearMonth)
    if (!content) return []
    return parseMonthFile(content)
  }

  async readMonthSummary(yearMonth: string): Promise<MonthSummary | null> {
    const content = await this.readMonthFile(yearMonth)
    if (!content) return null
    const fm = parseFrontmatter(content)
    if (fm.income === undefined || fm.expense === undefined || fm.netAsset === undefined) return null
    return { income: fm.income, expense: fm.expense, netAsset: fm.netAsset }
  }

  // ── Write / Edit / Delete ────────────────────────────────────────────────────

  /**
   * Write a new transaction. `tx.date` must be "MM/DD" format.
   * `yearMonth` is "yyyy-mm".
   */
  async writeTransaction(tx: Transaction, yearMonth: string): Promise<void> {
    const content = await this.readMonthFile(yearMonth)
    const transactions = content ? parseMonthFile(content) : []
    transactions.push(tx)
    transactions.sort((a, b) => b.date.localeCompare(a.date))
    const summary = this.computeSummary(transactions)
    await this.writeMonthFile(yearMonth, buildMonthContent(yearMonth, transactions, summary))
  }

  /**
   * Update an existing transaction. Handles cross-month moves automatically.
   * `oldYearMonth` and `newYearMonth` are "yyyy-mm".
   */
  async updateTransaction(
    oldTx: Transaction,
    oldYearMonth: string,
    newTx: Transaction,
    newYearMonth: string,
  ): Promise<void> {
    if (oldYearMonth === newYearMonth) {
      // Same month: replace in-place
      const content = await this.readMonthFile(oldYearMonth)
      const transactions = content ? parseMonthFile(content) : []
      const idx = this.findTransactionIndex(transactions, oldTx)
      if (idx !== -1) transactions[idx] = newTx
      transactions.sort((a, b) => b.date.localeCompare(a.date))
      const summary = this.computeSummary(transactions)
      await this.writeMonthFile(oldYearMonth, buildMonthContent(oldYearMonth, transactions, summary))
    } else {
      // Cross-month: delete from old, insert into new
      await this.deleteTransactionFromMonth(oldTx, oldYearMonth)
      await this.writeTransaction(newTx, newYearMonth)
    }
  }

  async deleteTransaction(tx: Transaction, yearMonth: string): Promise<void> {
    await this.deleteTransactionFromMonth(tx, yearMonth)
  }

  private async deleteTransactionFromMonth(tx: Transaction, yearMonth: string): Promise<void> {
    const content = await this.readMonthFile(yearMonth)
    if (!content) return
    const transactions = parseMonthFile(content)
    const idx = this.findTransactionIndex(transactions, tx)
    if (idx !== -1) transactions.splice(idx, 1)
    const summary = this.computeSummary(transactions)
    await this.writeMonthFile(yearMonth, buildMonthContent(yearMonth, transactions, summary))
  }

  private findTransactionIndex(transactions: Transaction[], target: Transaction): number {
    return transactions.findIndex(tx =>
      tx.date === target.date &&
      tx.type === target.type &&
      tx.amount === target.amount &&
      tx.note === target.note &&
      (tx.wallet ?? '') === (target.wallet ?? '') &&
      (tx.fromWallet ?? '') === (target.fromWallet ?? '') &&
      (tx.toWallet ?? '') === (target.toWallet ?? '') &&
      (tx.category ?? '') === (target.category ?? ''),
    )
  }

  // ── Frontmatter Cache ────────────────────────────────────────────────────────

  /**
   * On plugin load: only recalculate months that are missing frontmatter.
   */
  async bootstrapFrontmatter(): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(this.config.folderName)
    if (!folder) return

    const files = this.app.vault.getMarkdownFiles().filter((f: TFile) =>
      f.path.startsWith(this.config.folderName + '/') &&
      /\d{4}-\d{2}\.md$/.test(f.basename + '.md'),
    )

    for (const file of files) {
      const content = await this.app.vault.read(file)
      const fm = parseFrontmatter(content)
      if (fm.netAsset === undefined) {
        const yearMonth = file.basename
        await this.recalculateFrontmatter(yearMonth)
      }
    }
  }

  /**
   * Recompute income/expense/netAsset for a given month and persist to frontmatter.
   */
  async recalculateFrontmatter(yearMonth: string): Promise<void> {
    const content = await this.readMonthFile(yearMonth)
    if (!content) return
    const transactions = parseMonthFile(content)
    const summary = this.computeSummary(transactions)
    await this.writeMonthFile(yearMonth, buildMonthContent(yearMonth, transactions, summary))
  }

  // ── Net Asset & Wallet Balance Calculation ────────────────────────────────────

  /**
   * Compute the current balance of every wallet across all available months.
   */
  async calculateAllWalletBalances(): Promise<WalletBalance[]> {
    const allMonths = await this.getAllYearMonths()
    const allTransactions: Transaction[] = []
    for (const ym of allMonths) {
      const txs = await this.readMonth(ym)
      allTransactions.push(...txs)
    }
    return this.computeWalletBalances(allTransactions)
  }

  computeWalletBalances(transactions: Transaction[]): WalletBalance[] {
    const { wallets } = this.config

    // Separate computation per wallet
    const balanceMap = new Map<string, number>()
    for (const w of wallets) {
      // creditCard: initialBalance is debt (positive) → store as positive, subtract when computing net asset
      balanceMap.set(w.name, w.initialBalance)
    }

    for (const tx of transactions) {
      switch (tx.type) {
        case 'expense':
          if (tx.wallet && balanceMap.has(tx.wallet)) {
            const w = wallets.find(w => w.name === tx.wallet)
            if (w?.type === 'creditCard') {
              // Credit expense increases debt
              balanceMap.set(tx.wallet, (balanceMap.get(tx.wallet) ?? 0) + tx.amount)
            } else {
              balanceMap.set(tx.wallet, (balanceMap.get(tx.wallet) ?? 0) - tx.amount)
            }
          }
          break
        case 'income':
          if (tx.wallet && balanceMap.has(tx.wallet)) {
            balanceMap.set(tx.wallet, (balanceMap.get(tx.wallet) ?? 0) + tx.amount)
          }
          break
        case 'transfer':
          if (tx.fromWallet && balanceMap.has(tx.fromWallet)) {
            balanceMap.set(tx.fromWallet, (balanceMap.get(tx.fromWallet) ?? 0) - tx.amount)
          }
          if (tx.toWallet && balanceMap.has(tx.toWallet)) {
            balanceMap.set(tx.toWallet, (balanceMap.get(tx.toWallet) ?? 0) + tx.amount)
          }
          break
        case 'repayment':
          // repayment from bank/cash (reduce balance) to creditCard (reduce debt)
          if (tx.fromWallet && balanceMap.has(tx.fromWallet)) {
            balanceMap.set(tx.fromWallet, (balanceMap.get(tx.fromWallet) ?? 0) - tx.amount)
          }
          if (tx.toWallet && balanceMap.has(tx.toWallet)) {
            // Paying credit card reduces debt (outstanding balance decreases)
            balanceMap.set(tx.toWallet, (balanceMap.get(tx.toWallet) ?? 0) - tx.amount)
          }
          break
      }
    }

    // Sort: cash → bank → creditCard
    const order: Record<string, number> = { cash: 0, bank: 1, creditCard: 2 }
    const sortedWallets = [...wallets].sort((a, b) =>
      (order[a.type] ?? 3) - (order[b.type] ?? 3),
    )

    return sortedWallets.map(w => ({
      wallet: w,
      balance: balanceMap.get(w.name) ?? w.initialBalance,
    }))
  }

  computeNetAsset(walletBalances: WalletBalance[]): number {
    let net = 0
    for (const { wallet, balance } of walletBalances) {
      if (!wallet.includeInNetAsset) continue
      if (wallet.type === 'creditCard') {
        net -= balance  // creditCard balance = outstanding debt
      } else {
        net += balance
      }
    }
    return net
  }

  // ── Summary for a single month ───────────────────────────────────────────────

  computeSummary(transactions: Transaction[]): MonthSummary {
    let income = 0
    let expense = 0
    for (const tx of transactions) {
      if (tx.type === 'income') income += tx.amount
      if (tx.type === 'expense') expense += tx.amount
    }
    // netAsset in monthly frontmatter = approximation; Dashboard re-computes from walletBalances
    return { income, expense, netAsset: 0 }
  }

  /** Group transactions by category for pie chart */
  groupByCategory(transactions: Transaction[], type: 'expense' | 'income'): Map<string, number> {
    const map = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.type !== type) continue
      const key = tx.category ?? 'other'
      map.set(key, (map.get(key) ?? 0) + tx.amount)
    }
    return map
  }

  // ── Utility ──────────────────────────────────────────────────────────────────

  /** Check if a wallet name is used in any transaction */
  async walletHasTransactions(walletName: string): Promise<boolean> {
    const months = await this.getAllYearMonths()
    for (const ym of months) {
      const txs = await this.readMonth(ym)
      const found = txs.some(tx =>
        tx.wallet === walletName ||
        tx.fromWallet === walletName ||
        tx.toWallet === walletName,
      )
      if (found) return true
    }
    return false
  }

  async getAllYearMonths(): Promise<string[]> {
    const files = this.app.vault.getMarkdownFiles().filter((f: TFile) =>
      f.path.startsWith(this.config.folderName + '/') &&
      /^\d{4}-\d{2}$/.test(f.basename),
    )
    return files.map((f: TFile) => f.basename).sort()
  }

  /** Get all month summaries for trend view (reads frontmatter only) */
  async getMonthSummaries(yearMonths: string[]): Promise<Map<string, MonthSummary>> {
    const result = new Map<string, MonthSummary>()
    for (const ym of yearMonths) {
      const summary = await this.readMonthSummary(ym)
      if (summary) result.set(ym, summary)
    }
    return result
  }

  /**
   * Compute cumulative net asset at each target month by replaying all transactions
   * from inception up to each month. Used by TrendView.
   */
  async getNetAssetTimeline(targetMonths: string[]): Promise<Map<string, number>> {
    const allAvailableMonths = await this.getAllYearMonths()
    const lastTarget = targetMonths[targetMonths.length - 1]
    const relevantMonths = allAvailableMonths.filter(m => m <= lastTarget).sort()

    const accumulated: Transaction[] = []
    const result = new Map<string, number>()

    for (const ym of relevantMonths) {
      const txs = await this.readMonth(ym)
      accumulated.push(...txs)
      if (targetMonths.includes(ym)) {
        const balances = this.computeWalletBalances(accumulated)
        result.set(ym, this.computeNetAsset(balances))
      }
    }

    return result
  }

  private getLocaleCashName(): string {
    try {
      const lang = (window as any).moment?.locale?.() ?? ''
      if (lang.startsWith('zh')) return '預設錢包'
    } catch { /* ignore */ }
    return 'Default Wallet'
  }

}
