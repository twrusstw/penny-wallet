import { App, TFile, normalizePath } from 'obsidian'
import {
  Transaction,
  TransactionType,
  WalletBalance,
  MonthSummary,
  PennyWalletConfig,
  DEFAULT_CONFIG,
} from '../types'

const ROOT_CONFIG_PATH = normalizePath('.penny-wallet.json')
const TABLE_HEADER = `| Date | Type | Wallet | From | To | Category | Note | Amount | CreatedAt |
|------|------|--------|------|----|----------|------|--------|-----------|`

// ─── Markdown Table Parsing ───────────────────────────────────────────────────

export function parseRow(line: string): Transaction | null {
  const cols = line.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1)
  if (cols.length !== 8 && cols.length !== 9) return null
  const [date, type, wallet, fromWallet, toWallet, category, note, amountStr, createdAtStr] = cols
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
    createdAt: (createdAtStr && createdAtStr !== '-') ? createdAtStr : undefined,
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
  const createdAt = tx.createdAt ?? '-'
  return `| ${d} | ${type} | ${wallet} | ${from} | ${to} | ${cat} | ${note} | ${amount} | ${createdAt} |`
}

export function parseMonthFile(content: string): Transaction[] {
  const lines = content.split('\n')
  const transactions: Transaction[] = []
  let inTable = false

  for (const line of lines) {
    const trimmed = line.trim()
    // Match both English and Chinese table headers
    if (!inTable && (trimmed.startsWith('| Date') || trimmed.startsWith('| 日期'))) {
      inTable = true
      continue
    }
    if (inTable && trimmed.startsWith('|---')) continue
    if (inTable && trimmed.startsWith('|')) {
      const tx = parseRow(trimmed)
      if (tx) transactions.push(tx)
    } else if (inTable && trimmed === '') {
      // empty line ends the table; stop parsing entirely
      break
    }
  }
  return transactions
}

export function parseFrontmatter(content: string): Partial<MonthSummary> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const fm: Record<string, number> = {}
  for (const line of match[1].split('\n')) {
    const [key, val] = line.split(':').map(s => s.trim())
    if (key && val) fm[key] = parseFloat(val)
  }
  return { income: fm['income'], expense: fm['expense'], netAsset: fm['netAsset'] }
}

export function buildMonthContent(yearMonth: string, transactions: Transaction[], summary: MonthSummary): string {
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
  private createdDefaultConfigOnLastLoad = false

  constructor(app: App) {
    this.app = app
  }

  get folderName(): string {
    return this.config.folderName
  }

  // ── Config ──────────────────────────────────────────────────────────────────

  async loadConfig(): Promise<PennyWalletConfig> {
    this.createdDefaultConfigOnLastLoad = false

    const path = ROOT_CONFIG_PATH
    const file = this.app.vault.getFileByPath(path)

    if (!file) {
      // Vault index may be stale at startup — check the filesystem directly
      const existsOnDisk = await this.app.vault.adapter.exists(path)
      if (existsOnDisk) {
        try {
          const raw = await this.app.vault.adapter.read(path)
          this.config = { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<PennyWalletConfig>) }
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
      this.createdDefaultConfigOnLastLoad = true
      return this.config
    }

    try {
      const raw = await this.app.vault.read(file)
      this.config = { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<PennyWalletConfig>) }
    } catch {
      this.config = { ...DEFAULT_CONFIG }
    }
    return this.config
  }

  didCreateDefaultConfigOnLastLoad(): boolean {
    return this.createdDefaultConfigOnLastLoad
  }

  updateCustomCategories(type: 'expense' | 'income', custom: string[]): void {
    const { options } = this.config
    this.config = {
      ...this.config,
      options: {
        ...options,
        categories: {
          ...options.categories,
          [type]: { ...options.categories[type], custom },
        },
      },
    }
  }

  async saveConfig(): Promise<void> {
    const path = ROOT_CONFIG_PATH
    const content = JSON.stringify(this.config, null, 2)
    const file = this.app.vault.getFileByPath(path)
    if (file) {
      await this.app.vault.modify(file, content)
    } else {
      try {
        await this.app.vault.create(path, content)
      } catch (e: unknown) {
        if (!(e instanceof Error) || !e.message?.includes('already exists')) throw e
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
    if (!this.app.vault.getFolderByPath(folder)) {
      try {
        await this.app.vault.createFolder(folder)
      } catch (e: unknown) {
        // Ignore "Folder already exists" error from race condition
        if (!(e instanceof Error) || !e.message?.includes('already exists')) {
          throw e
        }
      }
    }
  }

  private async readMonthFile(yearMonth: string): Promise<string | null> {
    const path = this.monthFilePath(yearMonth)
    const file = this.app.vault.getFileByPath(path)
    if (file) {
      return await this.app.vault.read(file)
    }
    return null
  }

  private async writeMonthFile(yearMonth: string, content: string): Promise<void> {
    await this.ensureFolder()
    const path = this.monthFilePath(yearMonth)
    const file = this.app.vault.getFileByPath(path)
    if (file) {
      await this.app.vault.modify(file, content)
    } else {
      try {
        await this.app.vault.create(path, content)
      } catch (e: unknown) {
        // Ignore "File already exists" error from race condition
        if (!(e instanceof Error) || !e.message?.includes('already exists')) {
          throw e
        }
        // File was created by another process; try to modify it
        const retryFile = this.app.vault.getFileByPath(path)
        if (retryFile) {
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
    transactions.push({ ...tx, createdAt: tx.createdAt ?? new Date().toISOString() })
    transactions.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      if (a.createdAt && b.createdAt) return a.createdAt.localeCompare(b.createdAt)
      return 0
    })
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
      if (idx !== -1) transactions[idx] = { ...newTx, createdAt: newTx.createdAt ?? oldTx.createdAt ?? new Date().toISOString() }
      transactions.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        if (a.createdAt && b.createdAt) return a.createdAt.localeCompare(b.createdAt)
        return 0
      })
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

  async renameWalletInTransactions(oldName: string, newName: string): Promise<void> {
    const months = this.getAllYearMonths()
    await Promise.all(months.map(async (ym) => {
      const content = await this.readMonthFile(ym)
      if (!content) return
      const transactions = parseMonthFile(content)
      const updated = transactions.map(tx => ({
        ...tx,
        wallet:     tx.wallet     === oldName ? newName : tx.wallet,
        fromWallet: tx.fromWallet === oldName ? newName : tx.fromWallet,
        toWallet:   tx.toWallet   === oldName ? newName : tx.toWallet,
      }))
      const hasChange = updated.some((tx, i) =>
        tx.wallet !== transactions[i].wallet ||
        tx.fromWallet !== transactions[i].fromWallet ||
        tx.toWallet !== transactions[i].toWallet,
      )
      if (!hasChange) return
      const summary = this.computeSummary(updated)
      await this.writeMonthFile(ym, buildMonthContent(ym, updated, summary))
    }))
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
      (tx.category ?? '') === (target.category ?? '') &&
      (tx.createdAt === undefined || target.createdAt === undefined || tx.createdAt === target.createdAt),
    )
  }

  // ── Frontmatter Cache ────────────────────────────────────────────────────────

  /**
   * On plugin load: only recalculate months that are missing frontmatter.
   */
  async bootstrapFrontmatter(): Promise<void> {
    const folder = this.app.vault.getFolderByPath(this.config.folderName)
    if (!folder) return

    const files = this.app.vault.getMarkdownFiles().filter((f: TFile) =>
      f.path.startsWith(this.config.folderName + '/') &&
      /^\d{4}-\d{2}$/.test(f.basename),
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
    const { balances } = await this.calculateWalletData()
    return balances
  }

  async calculateWalletData(): Promise<{ balances: WalletBalance[]; walletsWithTransactions: Set<string> }> {
    const allMonths = this.getAllYearMonths()
    const monthTransactions = await Promise.all(allMonths.map(ym => this.readMonth(ym)))
    const allTransactions: Transaction[] = []
    for (const txs of monthTransactions) allTransactions.push(...txs)

    const walletsWithTransactions = new Set<string>()
    for (const tx of allTransactions) {
      if (tx.wallet)      walletsWithTransactions.add(tx.wallet)
      if (tx.fromWallet)  walletsWithTransactions.add(tx.fromWallet)
      if (tx.toWallet)    walletsWithTransactions.add(tx.toWallet)
    }

    return { balances: this.computeWalletBalances(allTransactions), walletsWithTransactions }
  }

  computeWalletBalances(transactions: Transaction[]): WalletBalance[] {
    const { wallets } = this.config

    const balanceMap = new Map<string, number>()
    for (const w of wallets) {
      balanceMap.set(w.name, w.initialBalance)
    }

    for (const tx of transactions) {
      this.applyTxToBalanceMap(tx, balanceMap)
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

  /** Per-wallet balance at each target month end — cash + bank only */
  async getWalletBalanceTrend(targetMonths: string[]): Promise<Map<string, Map<string, number>>> {
    const trackedWallets = this.config.wallets.filter(
      w => w.status === 'active' && (w.type === 'cash' || w.type === 'bank')
    )
    const allAvailableMonths = this.getAllYearMonths()
    const lastTarget = targetMonths[targetMonths.length - 1]
    const relevantMonths = allAvailableMonths.filter(m => m <= lastTarget).sort()
    const monthTransactions = await Promise.all(relevantMonths.map(ym => this.readMonth(ym)))

    const balanceMap = new Map<string, number>()
    for (const w of this.config.wallets) balanceMap.set(w.name, w.initialBalance)

    // result: walletName → (yearMonth → balance)
    const result = new Map<string, Map<string, number>>()
    for (const w of trackedWallets) result.set(w.name, new Map())

    for (let i = 0; i < relevantMonths.length; i++) {
      for (const tx of monthTransactions[i]) this.applyTxToBalanceMap(tx, balanceMap)
      if (targetMonths.includes(relevantMonths[i])) {
        for (const w of trackedWallets) {
          result.get(w.name)!.set(relevantMonths[i], balanceMap.get(w.name) ?? 0)
        }
      }
    }

    return result
  }

  async getCategoryTrend(yearMonths: string[], category: string): Promise<Map<string, number>> {
    const allTxs = await Promise.all(yearMonths.map(ym => this.readMonth(ym)))
    const result = new Map<string, number>()
    yearMonths.forEach((ym, i) => {
      const total = allTxs[i]
        .filter(tx => tx.category === category)
        .reduce((sum, tx) => sum + tx.amount, 0)
      result.set(ym, total)
    })
    return result
  }

  // ── Utility ──────────────────────────────────────────────────────────────────

  /** Check if a wallet name is used in any transaction */
  async walletHasTransactions(walletName: string): Promise<boolean> {
    const months = this.getAllYearMonths()
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

  getAllYearMonths(): string[] {
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

  async getNetAssetTimeline(targetMonths: string[]): Promise<Map<string, number>> {
    const allAvailableMonths = this.getAllYearMonths()
    const lastTarget = targetMonths[targetMonths.length - 1]
    const relevantMonths = allAvailableMonths.filter(m => m <= lastTarget).sort()

    const monthTransactions = await Promise.all(relevantMonths.map(ym => this.readMonth(ym)))

    // Seed the balance map from each wallet's initialBalance
    const balanceMap = new Map<string, number>()
    for (const w of this.config.wallets) {
      balanceMap.set(w.name, w.initialBalance)
    }

    const result = new Map<string, number>()

    for (let i = 0; i < relevantMonths.length; i++) {
      for (const tx of monthTransactions[i]) {
        this.applyTxToBalanceMap(tx, balanceMap)
      }
      if (targetMonths.includes(relevantMonths[i])) {
        result.set(relevantMonths[i], this.computeNetAssetFromMap(balanceMap))
      }
    }

    return result
  }

  private applyTxToBalanceMap(tx: Transaction, map: Map<string, number>): void {
    const walletType = (name: string) => this.config.wallets.find(w => w.name === name)?.type
    switch (tx.type) {
      case 'expense':
        if (tx.wallet && map.has(tx.wallet)) {
          const delta = walletType(tx.wallet) === 'creditCard' ? tx.amount : -tx.amount
          map.set(tx.wallet, (map.get(tx.wallet) ?? 0) + delta)
        }
        break
      case 'income':
        if (tx.wallet && map.has(tx.wallet)) {
          map.set(tx.wallet, (map.get(tx.wallet) ?? 0) + tx.amount)
        }
        break
      case 'transfer':
        if (tx.fromWallet && map.has(tx.fromWallet))
          map.set(tx.fromWallet, (map.get(tx.fromWallet) ?? 0) - tx.amount)
        if (tx.toWallet && map.has(tx.toWallet))
          map.set(tx.toWallet, (map.get(tx.toWallet) ?? 0) + tx.amount)
        break
      case 'repayment':
        if (tx.fromWallet && map.has(tx.fromWallet))
          map.set(tx.fromWallet, (map.get(tx.fromWallet) ?? 0) - tx.amount)
        if (tx.toWallet && map.has(tx.toWallet))
          map.set(tx.toWallet, (map.get(tx.toWallet) ?? 0) - tx.amount)
        break
    }
  }

  private computeNetAssetFromMap(map: Map<string, number>): number {
    let net = 0
    for (const w of this.config.wallets) {
      if (!w.includeInNetAsset) continue
      const balance = map.get(w.name) ?? 0
      net += w.type === 'creditCard' ? -balance : balance
    }
    return net
  }

  private getLocaleCashName(): string {
    try {
      const lang = (window as Window & { moment?: { locale?: () => string } }).moment?.locale?.() ?? ''
      if (lang.startsWith('zh')) return '預設錢包'
    } catch { /* ignore */ }
    return 'Default Wallet'
  }

}
