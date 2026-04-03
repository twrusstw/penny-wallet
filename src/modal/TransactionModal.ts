import { App, Modal, Notice } from 'obsidian'
import { Transaction, TransactionType, TransactionModalParams, PennyWalletConfig } from '../types'
import { WalletFile, dateToMonthDay, dateToYearMonth } from '../io/WalletFile'
import { t, translateCategory } from '../i18n'

export class TransactionModal extends Modal {
  private walletFile: WalletFile
  private params: TransactionModalParams
  private editingTx: Transaction | null
  private editingYearMonth: string | null
  private onSuccess: (() => void) | null

  // Form state
  private type: TransactionType = 'expense'
  private date: string = ''       // yyyy-mm-dd
  private wallet: string = ''
  private fromWallet: string = ''
  private toWallet: string = ''
  private category: string = ''
  private note: string = ''
  private amount: string = ''

  // DOM refs
  private typeTabsEl!: HTMLElement
  private fieldsEl!: HTMLElement
  private errorEl!: HTMLElement

  constructor(
    app: App,
    walletFile: WalletFile,
    params: TransactionModalParams = {},
    editingTx: Transaction | null = null,
    editingYearMonth: string | null = null,
    onSuccess: (() => void) | null = null,
  ) {
    super(app)
    this.walletFile = walletFile
    this.params = params
    this.editingTx = editingTx
    this.editingYearMonth = editingYearMonth
    this.onSuccess = onSuccess
  }

  onOpen() {
    const config = this.walletFile.getConfig()
    this.initState(config)
    this.buildUI(config)
  }

  private initState(config: PennyWalletConfig) {
    if (this.editingTx) {
      const tx = this.editingTx
      this.type = tx.type
      // editingYearMonth is "yyyy-mm", tx.date is "MM/DD" e.g. "04/03"
      const ym = this.editingYearMonth ?? ''
      const day = tx.date.split('/')[1]
      this.date = ym && day ? `${ym}-${day}` : todayString()
      this.wallet = tx.wallet ?? ''
      this.fromWallet = tx.fromWallet ?? ''
      this.toWallet = tx.toWallet ?? ''
      this.category = tx.category ?? ''
      this.note = tx.note
      this.amount = String(tx.amount)
    } else {
      this.type = (this.params.type as TransactionType) ?? 'expense'
      this.date = this.params.date ?? todayString()
      this.wallet = this.params.wallet ?? config.defaultWallet ?? ''
      this.fromWallet = this.params.fromWallet ?? ''
      this.toWallet = this.params.toWallet ?? ''
      this.category = this.params.category ?? ''
      this.note = this.params.note ?? ''
      this.amount = this.params.amount != null ? String(this.params.amount) : ''
    }
  }

  private buildUI(config: PennyWalletConfig) {
    const { contentEl } = this
    contentEl.empty()
    contentEl.addClass('pw-modal')

    contentEl.createEl('h2', {
      text: this.editingTx ? t('modal.editTitle') : t('modal.addTitle'),
    })

    this.typeTabsEl = contentEl.createDiv('pw-type-tabs')
    this.renderTypeTabs()

    this.fieldsEl = contentEl.createDiv('pw-fields')
    this.renderFields(config)

    this.errorEl = contentEl.createDiv('pw-error')
    this.errorEl.style.display = 'none'

    const btnRow = contentEl.createDiv('pw-btn-row')
    const confirmBtn = btnRow.createEl('button', { text: t('ui.confirm'), cls: 'mod-cta' })
    const cancelBtn = btnRow.createEl('button', { text: t('ui.cancel') })

    confirmBtn.addEventListener('click', () => this.handleConfirm(config))
    cancelBtn.addEventListener('click', () => this.close())
  }

  private renderTypeTabs() {
    this.typeTabsEl.empty()
    const types: TransactionType[] = ['expense', 'income', 'transfer', 'repayment']
    for (const tp of types) {
      const tab = this.typeTabsEl.createEl('button', {
        text: t(`type.${tp}` as any),
        cls: 'pw-type-tab' + (this.type === tp ? ' is-active' : ''),
      })
      tab.addEventListener('click', () => {
        this.type = tp
        if (tp === 'expense' || tp === 'income') {
          this.fromWallet = ''
          this.toWallet = ''
        } else {
          this.wallet = ''
          this.category = ''
        }
        this.renderTypeTabs()
        this.renderFields(this.walletFile.getConfig())
      })
    }
  }

  private renderFields(config: PennyWalletConfig) {
    this.fieldsEl.empty()

    // Date field (always shown)
    this.addField(this.fieldsEl, t('modal.date'), () => {
      const input = createEl('input', { type: 'date' })
      input.value = this.date
      input.addEventListener('change', () => { this.date = input.value })
      return input
    })

    const activeWallets = config.wallets.filter(w => w.status === 'active')

    if (this.type === 'expense' || this.type === 'income') {
      this.addField(this.fieldsEl, t('modal.wallet'), () => {
        const sel = createEl('select')
        sel.createEl('option', { text: '—', value: '' })
        for (const w of activeWallets) {
          const opt = sel.createEl('option', { text: w.name, value: w.name })
          if (w.name === this.wallet) opt.selected = true
        }
        sel.addEventListener('change', () => { this.wallet = sel.value })
        return sel
      })

      const categories = this.getCategoryOptions(config)
      this.addField(this.fieldsEl, t('modal.category'), () => {
        const sel = createEl('select')
        sel.createEl('option', { text: '—', value: '' })
        for (const { key, label } of categories) {
          const opt = sel.createEl('option', { text: label, value: key })
          if (key === this.category) opt.selected = true
        }
        sel.addEventListener('change', () => { this.category = sel.value })
        return sel
      })
    } else {
      // From wallet — repayment excludes creditCard wallets as source
      const fromCandidates = this.type === 'repayment'
        ? activeWallets.filter(w => w.type !== 'creditCard')
        : activeWallets

      this.addField(this.fieldsEl, t('modal.fromWallet'), () => {
        const sel = createEl('select')
        sel.createEl('option', { text: '—', value: '' })
        for (const w of fromCandidates) {
          const opt = sel.createEl('option', { text: w.name, value: w.name })
          if (w.name === this.fromWallet) opt.selected = true
        }
        sel.addEventListener('change', () => { this.fromWallet = sel.value })
        return sel
      })

      // To wallet — repayment only allows creditCard wallets as target
      const toCandidates = this.type === 'repayment'
        ? activeWallets.filter(w => w.type === 'creditCard')
        : activeWallets

      this.addField(this.fieldsEl, t('modal.toWallet'), () => {
        const sel = createEl('select')
        sel.createEl('option', { text: '—', value: '' })
        for (const w of toCandidates) {
          const opt = sel.createEl('option', { text: w.name, value: w.name })
          if (w.name === this.toWallet) opt.selected = true
        }
        sel.addEventListener('change', () => { this.toWallet = sel.value })
        return sel
      })
    }

    this.addField(this.fieldsEl, t('modal.note'), () => {
      const input = createEl('input', { type: 'text', placeholder: t('modal.note') })
      input.value = this.note
      input.addEventListener('input', () => { this.note = input.value })
      return input
    })

    this.addField(this.fieldsEl, t('modal.amount'), () => {
      const dp = this.walletFile.getConfig().decimalPlaces ?? 0
      const input = createEl('input', { type: 'number', placeholder: dp === 2 ? '0.00' : '0' })
      input.value = this.amount
      input.setAttribute('min', '0')
      input.setAttribute('step', dp === 2 ? '0.01' : '1')
      input.addEventListener('input', () => { this.amount = input.value })
      setTimeout(() => input.focus(), 50)
      return input
    })
  }

  private addField(container: HTMLElement, label: string, buildInput: () => HTMLElement) {
    const row = container.createDiv('pw-field-row')
    row.createEl('label', { text: label, cls: 'pw-field-label' })
    const input = buildInput()
    input.addClass('pw-field-input')
    row.appendChild(input)
  }

  private getCategoryOptions(config: PennyWalletConfig): { key: string; label: string }[] {
    const defaultKeys = this.type === 'expense'
      ? ['food', 'transport', 'shopping', 'entertainment', 'medical', 'housing', 'other']
      : ['salary', 'bonus', 'side_income', 'other']

    const customs = this.type === 'expense'
      ? config.customExpenseCategories
      : config.customIncomeCategories

    return [
      ...defaultKeys.map(key => ({ key, label: translateCategory(key) })),
      ...customs.map(c => ({ key: c, label: c })),
    ]
  }

  private showError(msg: string) {
    this.errorEl.textContent = msg
    this.errorEl.style.display = 'block'
  }

  private clearError() {
    this.errorEl.style.display = 'none'
  }

  private validate(): boolean {
    this.clearError()
    const dp = this.walletFile.getConfig().decimalPlaces ?? 0
    const amount = parseFloat(this.amount)
    if (!this.amount || isNaN(amount)) { this.showError(t('err.amountRequired')); return false }
    if (amount <= 0) { this.showError(t('err.amountPositive')); return false }
    if (dp === 0 && !Number.isInteger(amount)) { this.showError(t('err.amountInteger')); return false }

    if (this.type === 'expense' || this.type === 'income') {
      if (!this.wallet) { this.showError(t('err.walletRequired')); return false }
    } else {
      if (!this.fromWallet) { this.showError(t('err.fromWalletRequired')); return false }
      if (!this.toWallet) { this.showError(t('err.toWalletRequired')); return false }

      if (this.type === 'transfer' && this.fromWallet === this.toWallet) {
        this.showError(t('err.sameWallet')); return false
      }

      if (this.type === 'repayment') {
        const config = this.walletFile.getConfig()
        const from = config.wallets.find(w => w.name === this.fromWallet)
        const to   = config.wallets.find(w => w.name === this.toWallet)
        if (from?.type === 'creditCard') { this.showError(t('err.repaymentFromCredit')); return false }
        if (to?.type !== 'creditCard')   { this.showError(t('err.repaymentToNonCredit')); return false }
      }
    }
    return true
  }

  private async handleConfirm(_config: PennyWalletConfig) {
    if (!this.validate()) return

    const newTx: Transaction = {
      date: dateToMonthDay(this.date),
      type: this.type,
      wallet:     (this.type === 'expense' || this.type === 'income') ? this.wallet : undefined,
      fromWallet: (this.type === 'transfer' || this.type === 'repayment') ? this.fromWallet : undefined,
      toWallet:   (this.type === 'transfer' || this.type === 'repayment') ? this.toWallet : undefined,
      category:   (this.type === 'expense' || this.type === 'income') ? (this.category || undefined) : undefined,
      note: this.note,
      amount: parseFloat(this.amount),
    }

    const newYearMonth = dateToYearMonth(this.date)

    try {
      if (this.editingTx && this.editingYearMonth) {
        await this.walletFile.updateTransaction(
          this.editingTx, this.editingYearMonth,
          newTx, newYearMonth,
        )
      } else {
        await this.walletFile.writeTransaction(newTx, newYearMonth)
      }

      this.close()
      this.onSuccess?.()
      new Notice(t(this.editingTx ? 'notice.transactionUpdated' : 'notice.transactionAdded'))
    } catch (e) {
      this.showError(String(e))
    }
  }

  onClose() {
    this.contentEl.empty()
  }
}

function todayString(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}
