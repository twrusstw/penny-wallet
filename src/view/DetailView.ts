import { ItemView, Modal, WorkspaceLeaf, Notice } from 'obsidian'
import { WalletFile } from '../io/WalletFile'
import { TransactionModal } from '../modal/TransactionModal'
import { t, translateCategory } from '../i18n'
import { Transaction, TransactionType } from '../types'

export const DETAIL_VIEW_TYPE = 'penny-wallet-detail'

export class DetailView extends ItemView {
  private walletFile: WalletFile
  private currentYearMonth: string
  private filterType: TransactionType | 'all' = 'all'
  private filterCategory: string = 'all'

  constructor(leaf: WorkspaceLeaf, walletFile: WalletFile) {
    super(leaf)
    this.walletFile = walletFile
    this.currentYearMonth = currentYearMonth()
  }

  getViewType() { return DETAIL_VIEW_TYPE }
  getDisplayText() { return t('detail.title') }
  getIcon() { return 'list' }

  async setState(state: any, result: any) {
    if (state?.yearMonth) this.currentYearMonth = state.yearMonth
    await super.setState(state, result)
    await this.render()
  }

  async onOpen() {
    this.registerEvent(
      (this.app.workspace as any).on('penny-wallet:refresh', () => this.render())
    )
    await this.render()
  }

  async onClose() {
    this.contentEl.empty()
  }

  async render() {
    const { contentEl } = this
    contentEl.empty()
    contentEl.addClass('pw-detail')

    const transactions = (await this.walletFile.readMonth(this.currentYearMonth))
      .sort((a, b) => b.date.localeCompare(a.date))
    const dp = this.walletFile.getConfig().decimalPlaces ?? 0

    // ── Block 1: Month nav ────────────────────────────────────────────────────
    const navRow = contentEl.createDiv('pw-nav-row')
    navRow.createEl('button', { text: '←', cls: 'pw-nav-btn' }).addEventListener('click', async () => {
      this.currentYearMonth = stepMonth(this.currentYearMonth, -1)
      await this.render()
    })
    navRow.createEl('span', { text: this.currentYearMonth, cls: 'pw-month-label' })
    const nextBtn = navRow.createEl('button', { text: '→', cls: 'pw-nav-btn' })
    nextBtn.disabled = isAfterCurrentMonth(stepMonth(this.currentYearMonth, 1))
    nextBtn.addEventListener('click', async () => {
      if (!nextBtn.disabled) {
        this.currentYearMonth = stepMonth(this.currentYearMonth, 1)
        await this.render()
      }
    })

    const addBtn = navRow.createEl('button', { text: '+ ' + t('ui.addTransaction'), cls: 'pw-action-btn' })
    addBtn.style.marginLeft = 'auto'
    addBtn.addEventListener('click', () => {
      new TransactionModal(this.app, this.walletFile, {}, null, null,
        () => (this.app.workspace as any).trigger('penny-wallet:refresh')
      ).open()
    })

    // ── Block 2: Filters ──────────────────────────────────────────────────────
    const filterRow = contentEl.createDiv('pw-filter-row')

    const typePills = filterRow.createDiv('pw-type-pills')
    const typeOptions: { value: TransactionType | 'all'; label: string }[] = [
      { value: 'all',        label: t('detail.filterAll') },
      { value: 'expense',    label: t('detail.filterExpense') },
      { value: 'income',     label: t('detail.filterIncome') },
      { value: 'transfer',   label: t('detail.filterTransfer') },
      { value: 'repayment',  label: t('detail.filterRepayment') },
    ]
    for (const opt of typeOptions) {
      const pill = typePills.createEl('button', {
        text: opt.label,
        cls: 'pw-pill' + (this.filterType === opt.value ? ' is-active' : ''),
      })
      pill.addEventListener('click', async () => {
        this.filterType = opt.value
        await this.render()
      })
    }

    const catSource = (this.filterType === 'all' || this.filterType === 'transfer' || this.filterType === 'repayment')
      ? transactions
      : transactions.filter(tx => tx.type === this.filterType)
    const allCategories = new Set<string>()
    catSource.forEach(tx => { if (tx.category) allCategories.add(tx.category) })
    if (this.filterCategory !== 'all' && !allCategories.has(this.filterCategory)) {
      this.filterCategory = 'all'
    }
    if (allCategories.size > 0) {
      const catSel = filterRow.createEl('select', { cls: 'pw-cat-filter' })
      catSel.createEl('option', { text: t('detail.allCategories'), value: 'all' })
      for (const cat of allCategories) {
        const opt = catSel.createEl('option', { text: translateCategory(cat), value: cat })
        if (cat === this.filterCategory) opt.selected = true
      }
      if (this.filterCategory === 'all') catSel.value = 'all'
      catSel.addEventListener('change', async () => {
        this.filterCategory = catSel.value
        await this.render()
      })
    }

    // ── Block 3: Transaction list ─────────────────────────────────────────────
    const filtered = transactions.filter(tx => {
      if (this.filterType !== 'all' && tx.type !== this.filterType) return false
      if (this.filterCategory !== 'all' && tx.category !== this.filterCategory) return false
      return true
    })

    const listCard = contentEl.createDiv('pw-card')
    const listEl = listCard.createDiv('pw-tx-list')
    if (filtered.length === 0) {
      listEl.createEl('p', { text: t('detail.noTransactions'), cls: 'pw-no-data' })
    } else {
      for (const tx of filtered) {
        this.renderTxRow(listEl, tx, dp)
      }
    }

    // ── Block 4: Subtotals ────────────────────────────────────────────────────
    let subIncome = 0, subExpense = 0
    for (const tx of filtered) {
      if (tx.type === 'income') subIncome += tx.amount
      if (tx.type === 'expense') subExpense += tx.amount
    }
    const subtotalEl = contentEl.createDiv('pw-subtotal-row')
    subtotalEl.createEl('span', {
      text: `${t('detail.subtotalIncome')}: ${formatAmount(subIncome, dp)}`,
      cls: 'pw-subtotal-income',
    })
    subtotalEl.createEl('span', {
      text: `${t('detail.subtotalExpense')}: ${formatAmount(subExpense, dp)}`,
      cls: 'pw-subtotal-expense',
    })
  }

  private renderTxRow(container: HTMLElement, tx: Transaction, dp: 0 | 2 = 0) {
    const row = container.createDiv('pw-tx-row')

    row.createEl('span', { text: tx.date, cls: 'pw-tx-date' })

    row.createEl('span', {
      text: t(`type.${tx.type}` as any),
      cls: `pw-type-badge pw-type-${tx.type}`,
    })

    const main = row.createDiv('pw-tx-main')
    const top = main.createDiv('pw-tx-top')
    const catText = tx.category ? translateCategory(tx.category) : '—'
    top.createEl('span', { text: catText, cls: 'pw-tx-cat' })
    if (tx.note) top.createEl('span', { text: tx.note, cls: 'pw-tx-note' })
    const walletText = tx.wallet ?? (tx.fromWallet && tx.toWallet ? `${tx.fromWallet} → ${tx.toWallet}` : '—')
    main.createDiv({ text: walletText, cls: 'pw-tx-wallet' })

    const amountCls = tx.type === 'income' ? 'pw-tx-amount is-income'
      : tx.type === 'expense' ? 'pw-tx-amount is-expense'
      : 'pw-tx-amount'
    const amountPrefix = tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''
    row.createEl('span', {
      text: amountPrefix + formatAmount(tx.amount, dp),
      cls: amountCls,
    })

    const actions = row.createDiv('pw-tx-actions')

    const editBtn = actions.createEl('button', { cls: 'pw-txn-btn' })
    editBtn.setAttribute('aria-label', t('ui.edit'))
    editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
    editBtn.addEventListener('click', () => {
      new TransactionModal(
        this.app,
        this.walletFile,
        {},
        tx,
        this.currentYearMonth,
        () => (this.app.workspace as any).trigger('penny-wallet:refresh'),
      ).open()
    })

    const deleteBtn = actions.createEl('button', { cls: 'pw-txn-btn pw-txn-btn-del' })
    deleteBtn.setAttribute('aria-label', t('ui.delete'))
    deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`
    deleteBtn.addEventListener('click', () => {
      this.confirmDelete(tx)
    })
  }

  private confirmDelete(tx: Transaction) {
    const modal = new ConfirmModal(
      this.app,
      t('confirm.deleteTransaction'),
      async () => {
        await this.walletFile.deleteTransaction(tx, this.currentYearMonth)
        new Notice(t('notice.transactionDeleted'));
        (this.app.workspace as any).trigger('penny-wallet:refresh')
      },
    )
    modal.open()
  }
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

class ConfirmModal extends Modal {
  private message: string
  private onConfirm: () => void

  constructor(app: any, message: string, onConfirm: () => void) {
    super(app)
    this.message = message
    this.onConfirm = onConfirm
  }

  onOpen() {
    const { contentEl } = this
    contentEl.createEl('p', { text: this.message })
    const row = contentEl.createDiv('pw-btn-row')
    row.createEl('button', { text: t('ui.confirm'), cls: 'mod-warning' })
      .addEventListener('click', () => { this.close(); this.onConfirm() })
    row.createEl('button', { text: t('ui.cancel') })
      .addEventListener('click', () => this.close())
  }

  onClose() { this.contentEl.empty() }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function stepMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function isAfterCurrentMonth(ym: string): boolean {
  return ym > currentYearMonth()
}

function formatAmount(n: number, dp: 0 | 2 = 0): string {
  return n.toLocaleString('zh-TW', { minimumFractionDigits: dp, maximumFractionDigits: dp })
}
