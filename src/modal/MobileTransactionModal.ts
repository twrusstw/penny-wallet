import { TransactionType, PennyWalletConfig } from '../types'
import { t } from '../i18n'
import { TransactionModal } from './TransactionModal'

export class MobileTransactionModal extends TransactionModal {
  private mobileTabsEl!: HTMLElement
  private mobileRowsEl!: HTMLElement
  private mobileAmountEl!: HTMLElement

  onOpen() {
    const config = this.walletFile.getConfig()
    this.initState(config)
    this.buildMobileUI(config)
    // iOS auto-focuses first button; delay ensures blur after animation
    setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 100)
  }

  private buildMobileUI(config: PennyWalletConfig) {
    const { contentEl, containerEl } = this
    contentEl.empty()
    contentEl.addClass('pw-mobile-content')
    containerEl.addClass('pw-transaction-modal-container')

    // Top bar: ✕ | title | ✓
    const topBar = contentEl.createDiv('pw-mobile-top-bar')
    const cancelBtn = topBar.createEl('button', { cls: 'pw-mobile-top-btn', text: '✕' })
    topBar.createEl('span', {
      cls: 'pw-mobile-top-title',
      text: this.editingTx ? t('modal.editTitle') : t('modal.addTitle'),
    })
    const confirmBtn = topBar.createEl('button', {
      cls: 'pw-mobile-top-btn pw-mobile-top-confirm',
      text: '✓',
    })
    cancelBtn.addEventListener('click', () => this.close())
    confirmBtn.addEventListener('click', () => this.handleConfirm())

    // Type tabs
    this.mobileTabsEl = contentEl.createDiv('pw-mobile-tabs')
    this.renderMobileTabs(config)

    // Amount display
    const amountArea = contentEl.createDiv('pw-mobile-amount-area')
    this.mobileAmountEl = amountArea.createDiv('pw-mobile-amount-display')
    this.updateAmountDisplay()

    // Error
    this.errorEl = contentEl.createDiv('pw-error pw-mobile-error')
    this.errorEl.style.display = 'none'

    // Field rows
    this.mobileRowsEl = contentEl.createDiv('pw-mobile-rows')
    this.renderMobileRows(config)

    // Numpad
    const numpadEl = contentEl.createDiv('pw-mobile-numpad')
    this.renderMobileNumpad(numpadEl)
  }

  private renderMobileTabs(config: PennyWalletConfig) {
    this.mobileTabsEl.empty()
    const types: TransactionType[] = ['expense', 'income', 'transfer', 'repayment']
    for (const tp of types) {
      const tab = this.mobileTabsEl.createEl('button', {
        text: t(`type.${tp}` as any),
        cls: 'pw-mobile-tab' + (this.type === tp ? ' is-active' : ''),
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
        this.renderMobileTabs(config)
        this.renderMobileRows(config)
      })
    }
  }

  private renderMobileRows(config: PennyWalletConfig) {
    this.mobileRowsEl.empty()
    const activeWallets = config.wallets.filter(w => w.status === 'active')

    // Date Picker
    let dateInput!: HTMLInputElement
    this.addMobilePickerRow(
      this.mobileRowsEl, t('modal.date'), this.formatMobileDate(),
      (valueEl) => {
        dateInput = createEl('input', { type: 'date' })
        dateInput.value = this.date
        dateInput.style.position = 'absolute'
        dateInput.style.opacity = '0'
        dateInput.style.width = '0'
        dateInput.style.height = '0'
        dateInput.addEventListener('change', () => {
          this.date = dateInput.value
          valueEl.textContent = this.formatMobileDate()
        })
        return dateInput
      },
      () => dateInput.focus(),
    )

    if (this.type === 'expense' || this.type === 'income') {
      // Wallet
      this.addMobilePickerRow(this.mobileRowsEl, t('modal.wallet'), this.wallet || '—', (valueEl) => {
        const sel = createEl('select')
        sel.addClass('pw-mobile-row-picker')
        sel.createEl('option', { text: '—', value: '' })
        for (const w of activeWallets) {
          const opt = sel.createEl('option', { text: w.name, value: w.name })
          if (w.name === this.wallet) opt.selected = true
        }
        sel.addEventListener('change', () => {
          this.wallet = sel.value
          valueEl.textContent = this.wallet || '—'
        })
        return sel
      })

      // Category
      const categories = this.getCategoryOptions(config)
      const catLabel = categories.find(c => c.key === this.category)?.label ?? (this.category || '—')
      this.addMobilePickerRow(this.mobileRowsEl, t('modal.category'), catLabel, (valueEl) => {
        const sel = createEl('select')
        sel.addClass('pw-mobile-row-picker')
        sel.createEl('option', { text: '—', value: '' })
        for (const { key, label } of categories) {
          const opt = sel.createEl('option', { text: label, value: key })
          if (key === this.category) opt.selected = true
        }
        sel.addEventListener('change', () => {
          this.category = sel.value
          const found = categories.find(c => c.key === this.category)
          valueEl.textContent = found?.label ?? (this.category || '—')
        })
        return sel
      })
    } else {
      // From wallet
      const fromCandidates = this.type === 'repayment'
        ? activeWallets.filter(w => w.type !== 'creditCard')
        : activeWallets
      this.addMobilePickerRow(this.mobileRowsEl, t('modal.fromWallet'), this.fromWallet || '—', (valueEl) => {
        const sel = createEl('select')
        sel.addClass('pw-mobile-row-picker')
        sel.createEl('option', { text: '—', value: '' })
        for (const w of fromCandidates) {
          const opt = sel.createEl('option', { text: w.name, value: w.name })
          if (w.name === this.fromWallet) opt.selected = true
        }
        sel.addEventListener('change', () => {
          this.fromWallet = sel.value
          valueEl.textContent = this.fromWallet || '—'
        })
        return sel
      })

      // To wallet
      const toCandidates = this.type === 'repayment'
        ? activeWallets.filter(w => w.type === 'creditCard')
        : activeWallets
      this.addMobilePickerRow(this.mobileRowsEl, t('modal.toWallet'), this.toWallet || '—', (valueEl) => {
        const sel = createEl('select')
        sel.addClass('pw-mobile-row-picker')
        sel.createEl('option', { text: '—', value: '' })
        for (const w of toCandidates) {
          const opt = sel.createEl('option', { text: w.name, value: w.name })
          if (w.name === this.toWallet) opt.selected = true
        }
        sel.addEventListener('change', () => {
          this.toWallet = sel.value
          valueEl.textContent = this.toWallet || '—'
        })
        return sel
      })
    }

    // Note
    const noteRow = this.mobileRowsEl.createDiv('pw-mobile-row')
    noteRow.createEl('span', { cls: 'pw-mobile-row-label', text: t('modal.note') })
    const noteInput = noteRow.createEl('input', {
      type: 'text',
      cls: 'pw-mobile-note-input',
      placeholder: t('modal.note'),
    })
    noteInput.value = this.note
    noteInput.setAttribute('enterkeyhint', 'done')
    noteInput.addEventListener('input', () => { this.note = noteInput.value })
    noteInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') noteInput.blur() })
  }

  private addMobilePickerRow(
    container: HTMLElement,
    label: string,
    initialValue: string,
    buildPicker: (valueEl: HTMLElement) => HTMLElement,
    onRowClick?: () => void,
  ) {
    const row = container.createDiv('pw-mobile-row')
    row.createEl('span', { cls: 'pw-mobile-row-label', text: label })
    const valueEl = row.createEl('span', { cls: 'pw-mobile-row-value', text: initialValue })
    const picker = buildPicker(valueEl)
    row.appendChild(picker)
    if (onRowClick) row.addEventListener('click', onRowClick)
  }

  private renderMobileNumpad(el: HTMLElement) {
    // Layout (4 cols):
    //  7   8   9   ⌫
    //  4   5   6   C
    //  1   2   3   ✓  ← ✓ spans rows 3–4
    //  .   0   00
    const topKeys = ['7', '8', '9', '⌫', '4', '5', '6', 'C', '1', '2', '3']
    const bottomKeys = ['.', '0', '00']

    for (const key of topKeys) {
      const btn = el.createEl('button', { cls: 'pw-mobile-numpad-btn', text: key })
      if (key === '⌫' || key === 'C') btn.addClass('pw-mobile-numpad-control')
      btn.addEventListener('click', () => this.handleNumpadKey(key))
    }

    // ✓ spans rows 3–4 at col 4
    const confirmBtn = el.createEl('button', {
      cls: 'pw-mobile-numpad-btn pw-mobile-numpad-confirm',
      text: '✓',
    })
    confirmBtn.style.gridRow = 'span 2'
    confirmBtn.addEventListener('click', () => this.handleNumpadKey('✓'))

    for (const key of bottomKeys) {
      const btn = el.createEl('button', { cls: 'pw-mobile-numpad-btn', text: key })
      btn.addEventListener('click', () => this.handleNumpadKey(key))
    }
  }

  private handleNumpadKey(key: string) {
    this.clearError()
    if (key === '✓') { this.handleConfirm(); return }
    if (key === 'C') { this.amount = ''; this.updateAmountDisplay(); return }
    if (key === '⌫') { this.amount = this.amount.slice(0, -1); this.updateAmountDisplay(); return }
    if (key === '.') {
      if (this.amount.includes('.')) return
      if (this.amount === '') this.amount = '0'
      this.amount += '.'
      this.updateAmountDisplay()
      return
    }
    if (key === '00') {
      if (this.amount === '' || this.amount === '0') return
      this.amount += '00'
      this.updateAmountDisplay()
      return
    }
    this.amount = this.amount === '0' ? key : this.amount + key
    this.updateAmountDisplay()
  }

  private updateAmountDisplay() {
    if (!this.mobileAmountEl) return
    this.mobileAmountEl.textContent = this.amount || '0'
  }

  private formatMobileDate(): string {
    return this.date.replace(/-/g, '/')
  }

  onClose() {
    this.containerEl.removeClass('pw-transaction-modal-container')
    super.onClose()
  }
}
