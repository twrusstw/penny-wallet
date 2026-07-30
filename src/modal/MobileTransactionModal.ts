import { setIcon } from 'obsidian'
import { TransactionType, PennyWalletConfig } from '../types'
import { t } from '../i18n'
import { TransactionModal } from './TransactionModal'
import { formatMobileHeroAmount } from '../utils'
import { getTransferWalletCandidates } from './transactionState'
import { openBottomSheetPicker, openBottomSheetShell, type BottomSheetOption } from './BottomSheetPicker'
import { openTagPicker } from './TagPicker'
import { MobileCalculatorPad } from './MobileCalculatorPad'
import {
  createMobileCalculatorState,
  pressMobileCalculatorKey,
  type MobileCalculatorKey,
  type MobileCalculatorState,
} from './mobileCalculatorState'

export class MobileTransactionModal extends TransactionModal {
  private mobileTabsEl!: HTMLElement
  private mobileRowsEl!: HTMLElement
  private mobileAmountEl!: HTMLElement
  private mobileCalculatorState: MobileCalculatorState = createMobileCalculatorState()
  private mobileCalculatorPad: MobileCalculatorPad | null = null
  private mobileCalculatorClose: (() => void) | null = null
  private mobileCalculatorTitleEl: HTMLElement | null = null
  private mobileDecimalPlaces = 0
  private viewportCleanups: (() => void)[] = []

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

    // Top bar: x | title | check
    const topBar = contentEl.createDiv('pw-mobile-top-bar')
    const cancelBtn = topBar.createEl('button', { cls: 'pw-mobile-top-btn', text: '✕' })
    const titleEl = topBar.createEl('span', {
      cls: 'pw-mobile-top-title',
      text: this.editingTx ? t('modal.editTitle') : t('modal.addTitle'),
    })
    if (this.editingTx) {
      const iconEl = titleEl.createSpan('pw-modal-title-icon')
      setIcon(iconEl, 'pencil')
    }
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
    amountArea.setAttribute('role', 'button')
    amountArea.tabIndex = 0
    amountArea.addEventListener('click', () => this.openCalculatorPad())
    amountArea.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      this.openCalculatorPad()
    })
    this.mobileAmountEl = amountArea.createDiv('pw-mobile-amount-display')
    this.mobileDecimalPlaces = config.decimalPlaces
    this.mobileCalculatorState = createMobileCalculatorState(this.amount, this.mobileDecimalPlaces)
    this.updateAmountDisplay()

    // Error
    this.errorEl = contentEl.createDiv('pw-error pw-mobile-error')
    this.errorEl.hide()

    // Field rows (delete row appended inside renderMobileRows when editing)
    this.mobileRowsEl = contentEl.createDiv('pw-mobile-rows')
    this.renderMobileRows(config)

    this.bindMobileTextFocusState()
  }

  private bindMobileTextFocusState() {
    const isTextKeyboardTarget = (target: EventTarget | null): target is HTMLElement => {
      return target instanceof HTMLElement &&
        target.matches('.pw-mobile-note-input, .pw-bottom-sheet-search, .pw-tag-picker-add-input')
    }

    this.contentEl.addEventListener('focusin', (e) => {
      if (isTextKeyboardTarget(e.target)) {
        this.contentEl.addClass('pw-mobile-text-focus')
      }
    })

    this.contentEl.addEventListener('focusout', () => {
      window.setTimeout(() => {
        if (!isTextKeyboardTarget(document.activeElement)) {
          this.contentEl.removeClass('pw-mobile-text-focus')
        }
      }, 0)
    })

    if (window.visualViewport) {
      const el = this.contentEl
      const update = () => {
        const kbHeight = Math.max(0, window.innerHeight - window.visualViewport!.height)
        if (kbHeight > 50) {
          el.style.setProperty('--pw-keyboard-h', `${kbHeight}px`)
        } else {
          el.style.removeProperty('--pw-keyboard-h')
        }
      }
      window.visualViewport.addEventListener('resize', update)
      this.viewportCleanups.push(() => window.visualViewport?.removeEventListener('resize', update))
    }
  }

  private renderMobileTabs(config: PennyWalletConfig) {
    this.mobileTabsEl.empty()
    const types: TransactionType[] = ['expense', 'income', 'transfer']
    for (const tp of types) {
      const tab = this.mobileTabsEl.createEl('button', {
        text: t(`label.type.${tp}`),
        cls: 'pw-mobile-tab' + (this.type === tp ? ' is-active' : ''),
      })
      tab.addEventListener('click', () => {
        this.resetStateForType(tp)
        this.renderMobileTabs(config)
        this.renderMobileRows(config)
      })
    }
  }

  private renderMobileRows(config: PennyWalletConfig) {
    this.mobileRowsEl.empty()
    const activeWallets = this.getActiveWallets(config)

    // Refund toggle first (expense only) — sub-option of the type tab, visually adjacent.
    if (this.type === 'expense') {
      const block = this.mobileRowsEl.createDiv('pw-refund-block')
      const refundRow = block.createDiv('pw-mobile-row pw-mobile-refund-row')
      const checkboxId = 'pw-mobile-refund-checkbox'
      refundRow.createEl('label', { cls: 'pw-mobile-row-label', text: t('modal.isRefund'), attr: { for: checkboxId } })
      const checkbox = refundRow.createEl('input', { type: 'checkbox' })
      checkbox.id = checkboxId
      checkbox.checked = this.isRefund
      checkbox.addEventListener('change', () => {
        this.isRefund = checkbox.checked
        this.updateAmountDisplay()
      })
      block.createDiv({ cls: 'pw-mobile-refund-hint-row', text: t('modal.isRefund.hint') })
    }

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
      () => {
        if (typeof dateInput.showPicker === 'function') {
          dateInput.showPicker()
        } else {
          dateInput.focus()
        }
      },
    ).addClass('pw-mobile-date-row')

    const categories = this.getCategoryOptions(config)
    const catLabel = categories.find(c => c.key === this.category)?.label ?? (this.category || '—')
    const isTransferOrPayment = this.type !== 'expense' && this.type !== 'income'
    const onCategoryChange = isTransferOrPayment
      ? (key: string) => { this.category = key; this.renderMobileRows(config) }
      : (key: string) => { this.category = key }

    this.addMobileBottomSheetRow(
      this.mobileRowsEl,
      t('modal.category'),
      catLabel,
      this.withEmptyOption(categories),
      () => this.category,
      onCategoryChange,
      true,
    )

    if (isTransferOrPayment) {
      this.normalizeWalletForCategory(config)

      const { fromCandidates: fromWallets, toCandidates: toWallets }
        = getTransferWalletCandidates(activeWallets, this.category)

      this.addMobileBottomSheetRow(
        this.mobileRowsEl,
        t('modal.fromWallet'),
        this.fromWallet || '—',
        this.withEmptyOption(fromWallets.map(w => ({ key: w.name, label: w.name }))),
        () => this.fromWallet,
        (key) => { this.fromWallet = key },
        true,
      )

      this.addMobileBottomSheetRow(
        this.mobileRowsEl,
        t('modal.toWallet'),
        this.toWallet || '—',
        this.withEmptyOption(toWallets.map(w => ({ key: w.name, label: w.name }))),
        () => this.toWallet,
        (key) => { this.toWallet = key },
        true,
      )
    } else {
      const walletOptions = this.type === 'income'
        ? activeWallets.filter(w => w.type !== 'creditCard')
        : activeWallets

      this.addMobileBottomSheetRow(
        this.mobileRowsEl,
        t('modal.wallet'),
        this.wallet || '—',
        this.withEmptyOption(walletOptions.map(w => ({ key: w.name, label: w.name }))),
        () => this.wallet,
        (key) => { this.wallet = key },
        true,
      )
    }

    // Tags — chips-or-placeholder row, taps anywhere to open multi-select picker
    const tagRow = this.mobileRowsEl.createDiv('pw-mobile-row')
    tagRow.dataset['testid'] = 'mobile-tag-row'
    tagRow.createEl('span', { cls: 'pw-mobile-row-label', text: t('modal.tags') })
    const tagWrapper = tagRow.createDiv('pw-tag-input-wrapper')
    const tagChipsEl = tagWrapper.createDiv('pw-mobile-tag-chips')
    tagChipsEl.dataset['testid'] = 'mobile-tag-chips'

    const renderMobChips = () => {
      tagChipsEl.empty()
      if (this.tags.length === 0) {
        tagChipsEl.createSpan({
          cls: 'pw-mobile-tag-row-placeholder',
          text: t('tagPicker.rowPlaceholder'),
        })
        return
      }
      for (const tag of this.tags) {
        const chip = tagChipsEl.createSpan({
          cls: 'pw-mobile-tag-chip',
          text: `#${tag}`,
        })
        chip.dataset['testid'] = 'mobile-tag-chip'
        chip.dataset['tag'] = tag
      }
    }

    tagRow.addEventListener('click', () => {
      this.closeCalculatorPad()
      openTagPicker({
        containerEl: this.contentEl,
        walletFile: this.walletFile,
        initialSelected: this.tags,
        onCommit: (selected) => {
          this.tags = selected
          renderMobChips()
        },
      })
    })

    renderMobChips()

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
    noteInput.addEventListener('focus', () => this.closeCalculatorPad())
    noteInput.addEventListener('input', () => { this.note = noteInput.value })
    noteInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') noteInput.blur() })

    this.renderMobileDeleteRow()
  }

  private renderMobileDeleteRow() {
    if (!this.editingTx) return
    const deleteWrap = this.mobileRowsEl.createDiv('pw-mobile-danger-zone')
    const deleteBtn = deleteWrap.createEl('button', {
      cls: 'pw-mobile-row pw-mobile-delete-row',
      text: t('ui.delete'),
    })
    deleteBtn.dataset['action'] = 'delete'
    let deleteTouched = false
    deleteBtn.addEventListener('touchend', (e) => {
      e.preventDefault()
      deleteTouched = true
      this.closeCalculatorPad()
      this.handleDelete()
    })
    deleteBtn.addEventListener('click', () => {
      if (deleteTouched) {
        deleteTouched = false
        return
      }
      this.closeCalculatorPad()
      this.handleDelete()
    })
  }

  private addMobilePickerRow(
    container: HTMLElement,
    label: string,
    initialValue: string,
    buildPicker: (valueEl: HTMLElement) => HTMLElement,
    onRowClick?: () => void,
  ): HTMLElement {
    const row = container.createDiv('pw-mobile-row')
    row.createEl('span', { cls: 'pw-mobile-row-label', text: label })
    const valueEl = row.createEl('span', { cls: 'pw-mobile-row-value', text: initialValue })
    const picker = buildPicker(valueEl)
    row.appendChild(picker)
    if (onRowClick) {
      row.addEventListener('click', () => {
        this.closeCalculatorPad()
        onRowClick()
      })
    }
    return row
  }

  private addMobileBottomSheetRow(
    container: HTMLElement,
    label: string,
    initialValue: string,
    options: BottomSheetOption[],
    getSelected: () => string,
    onSelect: (key: string) => void,
    required = false,
  ) {
    const row = container.createDiv('pw-mobile-row pw-mobile-bottom-sheet-row')
    row.setAttribute('role', 'button')
    row.tabIndex = 0
    const labelEl = row.createEl('span', { cls: 'pw-mobile-row-label', text: label })
    if (required) labelEl.createEl('span', { text: '*', cls: 'pw-field-required', attr: { 'aria-hidden': 'true' } })
    const valueEl = row.createEl('span', { cls: 'pw-mobile-row-value', text: initialValue })

    const openPicker = () => {
      this.closeCalculatorPad()
      openBottomSheetPicker({
        containerEl: this.contentEl,
        title: label,
        options,
        selected: getSelected(),
        searchable: true,
        onSelect: (key) => {
          onSelect(key)
          const found = options.find(option => option.key === key)
          valueEl.textContent = found?.label ?? (key || '—')
        },
      })
    }

    row.addEventListener('click', openPicker)
    row.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      openPicker()
    })
  }

  private withEmptyOption(options: BottomSheetOption[]): BottomSheetOption[] {
    return [{ key: '', label: '—' }, ...options]
  }

  private openCalculatorPad() {
    this.clearError()
    if (this.mobileCalculatorPad) return
    this.mobileCalculatorState = {
      ...this.mobileCalculatorState,
      amountValue: this.amount,
      decimalPlaces: this.mobileDecimalPlaces,
    }
    this.contentEl.addClass('pw-mobile-calculator-active')
    const { sheet, titleEl, close } = openBottomSheetShell({
      containerEl: this.contentEl,
      title: '',
      leftBtn: null,
      rightBtn: null,
      onClose: () => {
        this.mobileCalculatorPad = null
        this.mobileCalculatorClose = null
        this.mobileCalculatorTitleEl = null
        this.contentEl.removeClass('pw-mobile-calculator-active')
      },
    })
    sheet.addClass('pw-mobile-calculator-sheet')
    this.mobileCalculatorTitleEl = titleEl
    this.mobileCalculatorClose = close
    this.mobileCalculatorPad = new MobileCalculatorPad({
      parentEl: sheet,
      initialState: this.mobileCalculatorState,
      onKey: (key) => this.handleCalculatorKey(key),
    })
    this.updateAmountDisplay()
    this.updateCalculatorTitle()
  }

  private closeCalculatorPad() {
    if (this.mobileCalculatorClose) {
      this.mobileCalculatorClose()
      return
    }
    this.mobileCalculatorPad?.remove()
    this.mobileCalculatorPad = null
    this.mobileCalculatorTitleEl = null
    this.contentEl.removeClass('pw-mobile-calculator-active')
  }

  private handleCalculatorKey(key: MobileCalculatorKey) {
    this.clearError()
    this.mobileCalculatorState = pressMobileCalculatorKey(this.mobileCalculatorState, key)
    this.amount = this.mobileCalculatorState.amountValue
    this.mobileCalculatorPad?.update(this.mobileCalculatorState)
    this.updateAmountDisplay()
    this.updateCalculatorTitle()
    if (key === 'done' && !this.mobileCalculatorState.errorKey && !this.mobileCalculatorState.isPendingExpression) {
      this.closeCalculatorPad()
    }
  }

  private updateAmountDisplay() {
    if (!this.mobileAmountEl) return
    const isEmpty = this.amount === ''
    this.mobileAmountEl.textContent = formatMobileHeroAmount(this.amount, this.isRefund)
    this.mobileAmountEl.toggleClass('is-empty', isEmpty)
  }

  private updateCalculatorTitle() {
    if (!this.mobileCalculatorTitleEl) return
    const expressionText = this.mobileCalculatorState.expressionText
    this.mobileCalculatorTitleEl.textContent = expressionText
    this.mobileCalculatorTitleEl.toggleClass('is-empty', expressionText === '')
    this.mobileCalculatorTitleEl.toggleClass('is-warning', this.mobileCalculatorState.isPendingExpression)
  }

  private formatMobileDate(): string {
    return this.date.replace(/-/g, '/')
  }

  protected async handleConfirm() {
    if (this.mobileCalculatorState.submitBlocker) {
      this.showError(t(this.mobileCalculatorState.submitBlocker))
      return
    }
    await super.handleConfirm()
  }

  onClose() {
    this.mobileCalculatorClose?.()
    this.mobileCalculatorPad?.remove()
    this.mobileCalculatorPad = null
    this.mobileCalculatorClose = null
    this.viewportCleanups.forEach(fn => fn())
    this.viewportCleanups = []
    document.body.removeClass('pw-bottom-sheet-lock')
    this.containerEl.removeClass('pw-transaction-modal-container')
    this.contentEl.removeClass('pw-bottom-sheet-active')
    this.contentEl.removeClass('pw-mobile-text-focus')
    this.contentEl.removeClass('pw-mobile-calculator-active')
    super.onClose()
  }
}
