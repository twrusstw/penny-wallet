import { ItemView, Platform, WorkspaceLeaf, Notice } from 'obsidian'
import { WalletFile } from '../io/WalletFile'
import { TransactionModal } from '../modal/TransactionModal'
import { MobileTransactionModal } from '../modal/MobileTransactionModal'
import { ConfirmModal } from '../modal/ConfirmModal'
import { t, translateCategory } from '../i18n'
import { Transaction, TransactionType } from '../types'
import { currentYearMonth, stepMonth, isAfterCurrentMonth, formatAmount } from '../utils'

export const DETAIL_VIEW_TYPE = 'penny-wallet-detail'

export class DetailView extends ItemView {
  private walletFile: WalletFile
  private currentYearMonth: string
  private filterTypes: Set<TransactionType> = new Set()   // empty = all
  private filterCategories: Set<string> = new Set()       // empty = all
  private filterSearch: string = ''
  private catPanelOpen: boolean = false

  // Refs for lightweight list updates (search)
  private cachedTransactions: Transaction[] = []
  private cachedDp: 0 | 2 = 0
  private listEl: HTMLElement | null = null
  private subtotalEl: HTMLElement | null = null

  constructor(leaf: WorkspaceLeaf, walletFile: WalletFile) {
    super(leaf)
    this.walletFile = walletFile
    this.currentYearMonth = currentYearMonth()
  }

  getViewType() { return DETAIL_VIEW_TYPE }
  getDisplayText() { return t('detail.title') }
  getIcon() { return 'pw-icon' }

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

    this.cachedTransactions = (await this.walletFile.readMonth(this.currentYearMonth))
      .sort((a, b) => b.date.localeCompare(a.date))
    this.cachedDp = this.walletFile.getConfig().decimalPlaces ?? 0

    // ── Header (fixed) ────────────────────────────────────────────────────────
    const header = contentEl.createDiv('pw-detail-header')

    // Month nav
    const navRow = header.createDiv('pw-nav-row')
    navRow.createEl('button', { text: '←', cls: 'pw-nav-btn' }).addEventListener('click', async () => {
      this.currentYearMonth = stepMonth(this.currentYearMonth, -1)
      this.filterCategories.clear()
      this.filterSearch = ''
      await this.render()
    })
    navRow.createEl('span', { text: this.currentYearMonth, cls: 'pw-month-label' })
    const nextBtn = navRow.createEl('button', { text: '→', cls: 'pw-nav-btn' })
    nextBtn.disabled = isAfterCurrentMonth(stepMonth(this.currentYearMonth, 1))
    nextBtn.addEventListener('click', async () => {
      if (!nextBtn.disabled) {
        this.currentYearMonth = stepMonth(this.currentYearMonth, 1)
        this.filterCategories.clear()
        this.filterSearch = ''
        await this.render()
      }
    })

    const addBtn = navRow.createEl('button', { text: '+ ' + t('ui.addTransaction'), cls: 'pw-action-btn' })
    addBtn.addClass('pw-ml-auto')
    addBtn.addEventListener('click', () => {
      addBtn.disabled = true
      const ModalClass = Platform.isMobile ? MobileTransactionModal : TransactionModal
      new ModalClass(this.app, this.walletFile, {}, null, null,
        () => (this.app.workspace as any).trigger('penny-wallet:refresh'),
        () => { addBtn.disabled = false },
      ).open()
    })

    // Type pills (multi-select) + category dropdown in the same row
    const typePills = header.createDiv('pw-type-pills')
    const allTypePill = typePills.createEl('button', {
      text: t('detail.filterAll'),
      cls: 'pw-pill' + (this.filterTypes.size === 0 ? ' is-active' : ''),
    })
    allTypePill.addEventListener('click', async () => {
      this.filterTypes.clear()
      this.filterCategories.clear()
      await this.render()
    })

    const typeOptions: { value: TransactionType; label: string }[] = [
      { value: 'expense',   label: t('detail.filterExpense') },
      { value: 'income',    label: t('detail.filterIncome') },
      { value: 'transfer',  label: t('detail.filterTransfer') },
      { value: 'repayment', label: t('detail.filterRepayment') },
    ]
    for (const opt of typeOptions) {
      const pill = typePills.createEl('button', {
        text: opt.label,
        cls: 'pw-pill' + (this.filterTypes.has(opt.value) ? ' is-active' : ''),
      })
      pill.addEventListener('click', async () => {
        if (this.filterTypes.has(opt.value)) {
          this.filterTypes.delete(opt.value)
        } else {
          this.filterTypes.add(opt.value)
        }
        this.filterCategories.clear()
        await this.render()
      })
    }

    // Category dropdown (same row, right side)
    const showCategories = this.filterTypes.size === 0 ||
      this.filterTypes.has('expense') ||
      this.filterTypes.has('income')

    if (showCategories) {
      const catSource = this.cachedTransactions.filter(tx => {
        if (this.filterTypes.size === 0) return tx.type === 'expense' || tx.type === 'income'
        return this.filterTypes.has(tx.type as TransactionType)
      })
      const expenseCats = new Set<string>()
      const incomeCats = new Set<string>()
      catSource.forEach(tx => {
        if (!tx.category) return
        if (tx.type === 'expense') expenseCats.add(tx.category)
        else if (tx.type === 'income') incomeCats.add(tx.category)
      })
      const allCategories = new Set<string>([...expenseCats, ...incomeCats])

      for (const cat of this.filterCategories) {
        if (!allCategories.has(cat)) this.filterCategories.delete(cat)
      }

      if (allCategories.size > 0) {
        const catDropdown = typePills.createDiv('pw-cat-dropdown')

        const catToggleBtn = catDropdown.createEl('button', { cls: 'pw-cat-toggle' })
        const updateToggleLabel = () => {
          const badge = this.filterCategories.size > 0 ? ` · ${this.filterCategories.size}` : ''
          catToggleBtn.setText(`${t('detail.filterCategory')}${badge} ${this.catPanelOpen ? '▴' : '▾'}`)
        }
        updateToggleLabel()

        const catPanel = catDropdown.createDiv('pw-cat-panel')
        if (!this.catPanelOpen) catPanel.style.display = 'none'

        // Close on outside click
        const onOutsideClick = (e: MouseEvent) => {
          if (!catDropdown.contains(e.target as Node)) {
            this.catPanelOpen = false
            catPanel.style.display = 'none'
            updateToggleLabel()
            document.removeEventListener('click', onOutsideClick)
          }
        }
        this.register(() => document.removeEventListener('click', onOutsideClick))

        // Re-register if panel was open before render (e.g. type pill clicked while dropdown open)
        if (this.catPanelOpen) {
          document.addEventListener('click', onOutsideClick)
        }

        catToggleBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.catPanelOpen = !this.catPanelOpen
          catPanel.style.display = this.catPanelOpen ? '' : 'none'
          updateToggleLabel()
          if (this.catPanelOpen) {
            document.addEventListener('click', onOutsideClick)
          } else {
            document.removeEventListener('click', onOutsideClick)
          }
        })

        // 全部 item
        const allItem = catPanel.createDiv('pw-cat-item')
        const allCheck = allItem.createEl('span', { cls: 'pw-cat-check' + (this.filterCategories.size === 0 ? ' is-checked' : '') })
        if (this.filterCategories.size === 0) allCheck.setText('✓')
        allItem.createEl('span', { text: t('detail.filterAll') })
        allItem.addEventListener('click', () => {
          this.filterCategories.clear()
          catPanel.querySelectorAll('.pw-cat-check').forEach((el, i) => {
            if (i === 0) { el.addClass('is-checked'); el.setText('✓') }
            else { el.removeClass('is-checked'); el.setText('') }
          })
          updateToggleLabel()
          this.applyFilters()
        })

        for (const cat of allCategories) {
          const item = catPanel.createDiv('pw-cat-item')
          const isChecked = this.filterCategories.has(cat)
          const check = item.createEl('span', { cls: 'pw-cat-check' + (isChecked ? ' is-checked' : '') })
          if (isChecked) check.setText('✓')
          item.createEl('span', { text: translateCategory(cat) })
          item.addEventListener('click', () => {
            if (this.filterCategories.has(cat)) {
              this.filterCategories.delete(cat)
              check.removeClass('is-checked')
              check.setText('')
            } else {
              this.filterCategories.add(cat)
              check.addClass('is-checked')
              check.setText('✓')
            }
            // Sync 全部 state
            const allCheckEl = catPanel.querySelector('.pw-cat-item:first-child .pw-cat-check')
            if (allCheckEl) {
              if (this.filterCategories.size === 0) { allCheckEl.addClass('is-checked'); allCheckEl.textContent = '✓' }
              else { allCheckEl.removeClass('is-checked'); allCheckEl.textContent = '' }
            }
            updateToggleLabel()
            this.applyFilters()
          })
        }
      }
    }

    // Search input
    const searchInput = header.createEl('input', {
      cls: 'pw-search-input',
      placeholder: t('detail.searchPlaceholder'),
    }) as HTMLInputElement
    searchInput.type = 'text'
    searchInput.value = this.filterSearch
    searchInput.addEventListener('input', () => {
      this.filterSearch = searchInput.value
      this.applyFilters()
    })

    // ── Scrollable list area ──────────────────────────────────────────────────
    const listWrap = contentEl.createDiv('pw-detail-list-wrap')
    this.listEl = listWrap.createDiv('pw-tx-list')

    // ── Subtotals (fixed bottom) ──────────────────────────────────────────────
    this.subtotalEl = contentEl.createDiv('pw-subtotal-row')

    this.applyFilters()
  }

  private applyFilters() {
    if (!this.listEl || !this.subtotalEl) return

    const filtered = this.cachedTransactions.filter(tx => {
      if (this.filterTypes.size > 0 && !this.filterTypes.has(tx.type as TransactionType)) return false
      if (this.filterCategories.size > 0 && !this.filterCategories.has(tx.category ?? '')) return false
      if (this.filterSearch && !tx.note?.toLowerCase().includes(this.filterSearch.toLowerCase())) return false
      return true
    })

    this.listEl.empty()
    if (filtered.length === 0) {
      this.listEl.createEl('p', { text: t('detail.noTransactions'), cls: 'pw-no-data' })
    } else {
      for (const tx of filtered) {
        this.renderTxRow(this.listEl, tx, this.cachedDp)
      }
    }

    let subIncome = 0, subExpense = 0
    for (const tx of filtered) {
      if (tx.type === 'income') subIncome += tx.amount
      if (tx.type === 'expense') subExpense += tx.amount
    }
    this.subtotalEl.empty()
    this.subtotalEl.createEl('span', {
      text: `${t('detail.subtotalExpense')}: ${formatAmount(subExpense, this.cachedDp)}`,
      cls: 'pw-subtotal-expense',
    })
    this.subtotalEl.createEl('span', {
      text: `${t('detail.subtotalIncome')}: ${formatAmount(subIncome, this.cachedDp)}`,
      cls: 'pw-subtotal-income',
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
      editBtn.disabled = true
      const ModalClass = Platform.isMobile ? MobileTransactionModal : TransactionModal
      new ModalClass(
        this.app,
        this.walletFile,
        {},
        tx,
        this.currentYearMonth,
        () => (this.app.workspace as any).trigger('penny-wallet:refresh'),
        () => { editBtn.disabled = false },
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
