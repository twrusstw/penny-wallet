import { TransactionType, PennyWalletConfig } from '../types'
import { t } from '../i18n'
import { TransactionModal } from './TransactionModal'
import { validateTag } from '../utils'

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
    let cancelTouched = false
    cancelBtn.addEventListener('touchend', (e) => { e.preventDefault(); cancelTouched = true; this.close() })
    cancelBtn.addEventListener('click', () => { if (cancelTouched) { cancelTouched = false; return } this.close() })
    let confirmTouched = false
    confirmBtn.addEventListener('touchend', (e) => { e.preventDefault(); confirmTouched = true; void this.handleConfirm() })
    confirmBtn.addEventListener('click', () => { if (confirmTouched) { confirmTouched = false; return } void this.handleConfirm() })

    // Type tabs
    this.mobileTabsEl = contentEl.createDiv('pw-mobile-tabs')
    this.renderMobileTabs(config)

    // Amount display
    const amountArea = contentEl.createDiv('pw-mobile-amount-area')
    this.mobileAmountEl = amountArea.createDiv('pw-mobile-amount-display')
    this.updateAmountDisplay()

    // Error
    this.errorEl = contentEl.createDiv('pw-error pw-mobile-error')
    this.errorEl.hide()

    // Field rows
    this.mobileRowsEl = contentEl.createDiv('pw-mobile-rows')
    this.renderMobileRows(config)

    // Numpad
    const numpadEl = contentEl.createDiv('pw-mobile-numpad')
    this.renderMobileNumpad(numpadEl)
  }

  private renderMobileTabs(config: PennyWalletConfig) {
    this.mobileTabsEl.empty()
    const types: TransactionType[] = ['expense', 'income', 'transfer']
    for (const tp of types) {
      const tab = this.mobileTabsEl.createEl('button', {
        text: t(`type.${tp}`),
        cls: 'pw-mobile-tab' + (this.type === tp ? ' is-active' : ''),
      })
      tab.addEventListener('click', () => {
        this.type = tp
        if (tp === 'expense' || tp === 'income') {
          this.fromWallet = ''
          this.toWallet = ''
        } else {
          this.wallet = ''
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
        dateInput.addClass('pw-hidden-date-trigger')
        dateInput.addEventListener('change', () => {
          this.date = dateInput.value
          valueEl.textContent = this.formatMobileDate()
        })
        return dateInput
      },
      () => dateInput.focus(),
    )

    if (this.type === 'expense' || this.type === 'income') {
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
    } else {
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
          this.renderMobileRows(config)
        })
        return sel
      })

      // Normalize wallet state when category constrains wallet types
      if (this.category === 'credit_card_payment') {
        const fromType = config.wallets.find(w => w.name === this.fromWallet)?.type
        const toType   = config.wallets.find(w => w.name === this.toWallet)?.type
        if (fromType === 'creditCard') this.fromWallet = ''
        if (toType && toType !== 'creditCard') this.toWallet = ''
      } else if (this.category === 'credit_card_refund') {
        const fromType = config.wallets.find(w => w.name === this.fromWallet)?.type
        if (fromType && fromType !== 'creditCard') this.fromWallet = ''
        this.toWallet = this.fromWallet
      }

      if (this.category === 'credit_card_refund') {
        // Single account field — always a credit card
        const ccWallets = activeWallets.filter(w => w.type === 'creditCard')
        this.addMobilePickerRow(this.mobileRowsEl, t('modal.wallet'), this.fromWallet || '—', (valueEl) => {
          const sel = createEl('select')
          sel.addClass('pw-mobile-row-picker')
          sel.createEl('option', { text: '—', value: '' })
          for (const w of ccWallets) {
            const opt = sel.createEl('option', { text: w.name, value: w.name })
            if (w.name === this.fromWallet) opt.selected = true
          }
          sel.addEventListener('change', () => {
            this.fromWallet = sel.value
            this.toWallet = sel.value
            valueEl.textContent = this.fromWallet || '—'
          })
          return sel
        })
      } else {
        const fromWallets = this.category === 'credit_card_payment'
          ? activeWallets.filter(w => w.type !== 'creditCard')
          : activeWallets
        const toWallets = this.category === 'credit_card_payment'
          ? activeWallets.filter(w => w.type === 'creditCard')
          : activeWallets

        // From wallet
        this.addMobilePickerRow(this.mobileRowsEl, t('modal.fromWallet'), this.fromWallet || '—', (valueEl) => {
          const sel = createEl('select')
          sel.addClass('pw-mobile-row-picker')
          sel.createEl('option', { text: '—', value: '' })
          for (const w of fromWallets) {
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
        this.addMobilePickerRow(this.mobileRowsEl, t('modal.toWallet'), this.toWallet || '—', (valueEl) => {
          const sel = createEl('select')
          sel.addClass('pw-mobile-row-picker')
          sel.createEl('option', { text: '—', value: '' })
          for (const w of toWallets) {
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
    }

    // Tags
    const tagRow = this.mobileRowsEl.createDiv('pw-mobile-row')
    tagRow.createEl('span', { cls: 'pw-mobile-row-label', text: t('modal.tags') })
    const tagWrapper = tagRow.createDiv('pw-tag-input-wrapper')
    const tagChipsEl = tagWrapper.createDiv('pw-tag-chips')
    const tagInput = tagWrapper.createEl('input', {
      type: 'text',
      cls: 'pw-tag-input',
      placeholder: t('modal.tagsPlaceholder'),
    })
    tagInput.setAttribute('enterkeyhint', 'done')
    const tagDropdown = tagWrapper.createDiv('pw-tag-dropdown')
    tagDropdown.hide()

    const availableTags = this.walletFile.getConfig().tags

    const updateMobDropdown = () => {
      const val = tagInput.value.replace(/^#/, '').toLowerCase()
      const suggestions = availableTags.filter(tag =>
        !this.tags.includes(tag) && (val === '' || tag.toLowerCase().includes(val))
      )
      tagDropdown.empty()
      if (suggestions.length === 0) { tagDropdown.hide(); return }
      for (const tag of suggestions) {
        const item = tagDropdown.createDiv({ cls: 'pw-tag-dropdown-item', text: tag })
        item.addEventListener('mousedown', (e) => { e.preventDefault(); addMobTag(tag); updateMobDropdown() })
      }
      const rect = tagInput.getBoundingClientRect()
      tagDropdown.style.left = `${rect.left}px`
      tagDropdown.style.top = `${rect.bottom + 2}px`
      tagDropdown.style.width = `${rect.width}px`
      tagDropdown.show()
    }

    const renderMobChips = () => {
      tagChipsEl.empty()
      for (const tag of this.tags) {
        const chip = tagChipsEl.createSpan('pw-tag-chip')
        chip.createSpan({ text: `#${tag}` })
        const x = chip.createSpan({ text: '×', cls: 'pw-tag-chip-remove' })
        x.addEventListener('click', () => {
          this.tags = this.tags.filter(t => t !== tag)
          renderMobChips()
          if (this.tags.length < 3) tagInput.removeAttribute('disabled')
        })
      }
    }

    const addMobTag = (value?: string) => {
      const raw = (value ?? tagInput.value).replace(/^#/, '').trim()
      if (!raw) return
      if (!validateTag(raw)) { tagInput.value = ''; tagDropdown.hide(); return }
      if (this.tags.includes(raw)) { tagInput.value = ''; tagDropdown.hide(); return }
      if (this.tags.length >= 3) return
      this.tags = [...this.tags, raw]
      tagInput.value = ''
      tagDropdown.hide()
      renderMobChips()
      if (this.tags.length >= 3) tagInput.setAttribute('disabled', 'true')
    }

    tagInput.addEventListener('input', updateMobDropdown)
    tagInput.addEventListener('focus', updateMobDropdown)
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addMobTag() }
      if (e.key === 'Escape') tagDropdown.hide()
    })
    tagInput.addEventListener('blur', () => {
      setTimeout(() => tagDropdown.hide(), 150)
      addMobTag()
    })
    renderMobChips()
    if (this.tags.length >= 3) tagInput.setAttribute('disabled', 'true')

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
      this.bindNumpadButton(btn, key)
    }

    // ✓ spans rows 3–4 at col 4 (handled via CSS class)
    const confirmBtn = el.createEl('button', {
      cls: 'pw-mobile-numpad-btn pw-mobile-numpad-confirm',
      text: '✓',
    })
    this.bindNumpadButton(confirmBtn, '✓')

    for (const key of bottomKeys) {
      const btn = el.createEl('button', { cls: 'pw-mobile-numpad-btn', text: key })
      this.bindNumpadButton(btn, key)
    }
  }

  private bindNumpadButton(btn: HTMLButtonElement, key: string) {
    let touched = false
    let clearPressedTimer: number | null = null
    const clearFocus = () => requestAnimationFrame(() => btn.blur())
    const setPressed = () => {
      if (clearPressedTimer !== null) {
        window.clearTimeout(clearPressedTimer)
        clearPressedTimer = null
      }
      btn.classList.add('is-pressed')
    }
    const clearPressed = () => {
      btn.classList.remove('is-pressed')
      clearFocus()
    }
    const scheduleClearPressed = () => {
      if (clearPressedTimer !== null) window.clearTimeout(clearPressedTimer)
      clearPressedTimer = window.setTimeout(() => {
        clearPressedTimer = null
        clearPressed()
      }, 90)
    }

    btn.addEventListener('touchstart', setPressed, { passive: true })
    btn.addEventListener('pointerdown', setPressed)
    btn.addEventListener('pointerup', scheduleClearPressed)
    btn.addEventListener('pointercancel', clearPressed)
    btn.addEventListener('pointerleave', clearPressed)
    btn.addEventListener('touchcancel', clearPressed)
    btn.addEventListener('touchend', (e) => {
      e.preventDefault()
      touched = true
      this.handleNumpadKey(key)
      scheduleClearPressed()
    })
    btn.addEventListener('click', () => {
      if (touched) {
        touched = false
        return
      }
      this.handleNumpadKey(key)
      scheduleClearPressed()
    })
  }

  private handleNumpadKey(key: string) {
    this.clearError()
    if (key === '✓') { void this.handleConfirm(); return }
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
