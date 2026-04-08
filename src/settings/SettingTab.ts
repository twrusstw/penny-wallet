import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian'
import { WalletFile } from '../io/WalletFile'
import { ConfirmModal } from '../modal/ConfirmModal'
import { Wallet, WalletBalance, WalletType } from '../types'
import { t, tn } from '../i18n'

export class PennyWalletSettingTab extends PluginSettingTab {
  private walletFile: WalletFile

  constructor(app: App, plugin: Plugin, walletFile: WalletFile) {
    super(app, plugin)
    this.walletFile = walletFile
  }

  display(restoreScrollTop?: number): void {
    const { containerEl } = this
    containerEl.empty()
    new Setting(containerEl).setName(t('settings.title')).setHeading()

    void (async () => {
      let walletBalances: WalletBalance[] = []
      let walletsWithTransactions = new Set<string>()
      try {
        const data = await this.walletFile.calculateWalletData()
        walletBalances = data.balances
        walletsWithTransactions = data.walletsWithTransactions
      } catch { /* show initial balance only if calculation fails */ }

      this.renderGeneral()
      this.renderActiveWallets(walletBalances, walletsWithTransactions)
      this.renderArchivedWallets()
      this.renderAddWallet()
      this.renderCategories()

      if (restoreScrollTop !== undefined) {
        const scrollEl = containerEl.closest<HTMLElement>('.vertical-tab-content')
        if (scrollEl) scrollEl.scrollTop = restoreScrollTop
      }
    })()
  }

  private renderGeneral() {
    const config = this.walletFile.getConfig()
    const { containerEl } = this

    new Setting(containerEl).setName(t('settings.general')).setHeading()

    const group = containerEl.createDiv('pw-settings-group')

    new Setting(group)
      .setName(t('settings.folderName'))
      .setDesc(t('settings.folderNameDesc'))
      .addText(text => text
        .setValue(config.folderName)
        .onChange((value) => {
          if (value.trim()) {
            this.walletFile.updateConfig({ folderName: value.trim() })
            void this.walletFile.saveConfig()
          }
        }))

    new Setting(group)
      .setName(t('settings.defaultWallet'))
      .setDesc(t('settings.defaultWalletDesc'))
      .addDropdown(drop => {
        const active = config.wallets.filter(w => w.status === 'active')
        for (const w of active) drop.addOption(w.name, w.name)
        drop.setValue(config.defaultWallet)
        drop.onChange((value) => {
          this.walletFile.updateConfig({ defaultWallet: value })
          void this.walletFile.saveConfig()
        })
      })

    new Setting(group)
      .setName(t('settings.decimalPlaces'))
      .setDesc(t('settings.decimalPlacesDesc'))
      .addDropdown(drop => {
        drop.addOption('0', t('settings.dp0'))
        drop.addOption('2', t('settings.dp2'))
        drop.setValue(String(config.decimalPlaces ?? 0))
        drop.onChange((value) => {
          this.walletFile.updateConfig({ decimalPlaces: Number(value) as 0 | 2 })
          void this.walletFile.saveConfig()
          this.app.workspace.trigger('penny-wallet:refresh')
        })
      })
  }

  private renderActiveWallets(walletBalances: WalletBalance[], walletsWithTransactions: Set<string>) {
    const config = this.walletFile.getConfig()
    const { containerEl } = this

    new Setting(containerEl).setName(t('settings.activeWallets')).setHeading()

    const active = config.wallets.filter(w => w.status === 'active')
    if (active.length === 0) {
      containerEl.createEl('p', { text: t('settings.noActiveWallets'), cls: 'pw-settings-empty' })
      return
    }

    const group = containerEl.createDiv('pw-settings-group')

    for (const wallet of active) {
      const wb = walletBalances.find(b => b.wallet.name === wallet.name)
      const currentBalance = wb?.balance ?? wallet.initialBalance
      const isDebt = wallet.type === 'creditCard'
      const displayBalance = isDebt
        ? `${t('settings.creditDebtPrefix')}${currentBalance.toLocaleString()}`
        : currentBalance.toLocaleString()

      const row = group.createDiv('pw-wallet-row')

      const info = row.createDiv('pw-wallet-row-info')
      info.createSpan({ text: wallet.name, cls: 'pw-wallet-row-name' })
      info.createSpan({ text: t(`walletType.${wallet.type}`), cls: 'pw-wallet-type-badge' })

      row.createSpan({
        text: displayBalance,
        cls: `pw-wallet-row-balance${isDebt ? ' is-debt' : ''}`,
      })

      const actions = row.createDiv('pw-wallet-row-actions')

      const editBtn = actions.createEl('button', { text: t('ui.edit') })
      editBtn.dataset['action'] = 'edit'
      editBtn.addEventListener('click', () => {
        new WalletEditModal(this.app, wallet, async (updated) => {
          const wallets = config.wallets.map(w => w.name === wallet.name ? { ...w, ...updated } : w)
          if (updated.name && updated.name !== wallet.name && config.defaultWallet === wallet.name) {
            this.walletFile.updateConfig({ wallets, defaultWallet: updated.name })
          } else {
            this.walletFile.updateConfig({ wallets })
          }
          await this.walletFile.saveConfig()
          this.app.workspace.trigger('penny-wallet:refresh')
          void this.display()
        }).open()
      })

      const actionBtn = actions.createEl('button')
      if (walletsWithTransactions.has(wallet.name)) {
        actionBtn.textContent = t('ui.archive')
        actionBtn.dataset['action'] = 'archive'
        actionBtn.classList.add('mod-warning')
        actionBtn.addEventListener('click', () => {
          new ConfirmModal(this.app, t('confirm.archiveWallet'), async () => {
            const wallets = config.wallets.map(w =>
              w.name === wallet.name ? { ...w, status: 'archived' as const } : w)
            this.walletFile.updateConfig({ wallets })
            await this.walletFile.saveConfig()
            void this.display()
          }).open()
        })
      } else {
        actionBtn.textContent = t('ui.delete')
        actionBtn.dataset['action'] = 'delete'
        actionBtn.classList.add('mod-warning')
        actionBtn.addEventListener('click', () => {
          new ConfirmModal(this.app, t('confirm.deleteWallet'), async () => {
            const wallets = config.wallets.filter(w => w.name !== wallet.name)
            const defaultWallet = config.defaultWallet === wallet.name
              ? (wallets.find(w => w.status === 'active')?.name ?? '')
              : config.defaultWallet
            this.walletFile.updateConfig({ wallets, defaultWallet })
            await this.walletFile.saveConfig()
            void this.display()
          }).open()
        })
      }
    }
  }

  private renderArchivedWallets() {
    const config = this.walletFile.getConfig()
    const { containerEl } = this

    const archived = config.wallets.filter(w => w.status === 'archived')
    if (archived.length === 0) return

    new Setting(containerEl).setName(t('settings.archivedWallets')).setHeading()

    for (const wallet of archived) {
      new Setting(containerEl)
        .setName(`${wallet.name}（${t(`walletType.${wallet.type}`)}）`)
        .addToggle(toggle => toggle
          .setValue(wallet.includeInNetAsset)
          .setTooltip(t('settings.includeInNetAsset'))
          .onChange((value) => {
            const wallets = config.wallets.map(w =>
              w.name === wallet.name ? { ...w, includeInNetAsset: value } : w,
            )
            this.walletFile.updateConfig({ wallets })
            void this.walletFile.saveConfig()
          }))
        .addButton(btn => {
          btn.setButtonText(t('ui.unarchive'))
          btn.buttonEl.dataset['action'] = 'unarchive'
          btn.onClick(() => {
            void (async () => {
              const wallets = config.wallets.map(w =>
                w.name === wallet.name ? { ...w, status: 'active' as const } : w,
              )
              this.walletFile.updateConfig({ wallets })
              await this.walletFile.saveConfig()
              void this.display()
            })()
          })
        })
    }
  }

  private renderAddWallet() {
    const { containerEl } = this
    new Setting(containerEl).setName(t('settings.addWallet')).setHeading()

    let newName = ''
    let newType: WalletType = 'cash'
    let newBalance = 0

    const cardEl = containerEl.createDiv('pw-card pw-add-wallet-card')
    const formEl = cardEl.createDiv('pw-add-wallet-form')

    const nameField = formEl.createDiv('pw-add-wallet-field')
    nameField.createEl('label', {
      text: t('settings.walletName'),
      cls: 'pw-setting-input-subtitle',
    })
    const nameInput = nameField.createEl('input', {
      type: 'text',
      placeholder: t('settings.walletName'),
      cls: 'pw-add-wallet-input',
    })
    nameInput.addEventListener('input', () => {
      newName = nameInput.value.trim()
    })

    const typeField = formEl.createDiv('pw-add-wallet-field')
    typeField.createEl('label', {
      text: t('settings.walletType'),
      cls: 'pw-setting-input-subtitle',
    })
    const typeSelect = typeField.createEl('select', { cls: 'pw-add-wallet-input' })
    const walletTypes: WalletType[] = ['cash', 'bank', 'creditCard']
    for (const walletType of walletTypes) {
      typeSelect.createEl('option', {
        value: walletType,
        text: t(`walletType.${walletType}`),
      })
    }
    typeSelect.value = 'cash'
    typeSelect.addEventListener('change', () => {
      newType = typeSelect.value as WalletType
      updateBalanceHint()
    })

    const balanceField = formEl.createDiv('pw-add-wallet-field')
    balanceField.createEl('label', {
      text: t('settings.initialBalance'),
      cls: 'pw-setting-input-subtitle',
    })
    const balanceInput = balanceField.createEl('input', {
      type: 'number',
      placeholder: '0',
      cls: 'pw-add-wallet-input',
    })
    balanceInput.addEventListener('input', () => {
      newBalance = parseFloat(balanceInput.value) || 0
    })

    const balanceHintEl = cardEl.createDiv('pw-balance-hint')
    updateBalanceHint()

    function updateBalanceHint() {
      balanceHintEl.textContent = newType === 'creditCard'
        ? t('settings.creditBalanceHint')
        : t('settings.cashBankBalanceHint')
    }

    const submitRow = cardEl.createDiv('pw-add-wallet-submit')
    const addBtn = submitRow.createEl('button', {
      text: t('settings.addWallet'),
      cls: 'mod-cta',
    })

    const submitAddWallet = async () => {
      const config = this.walletFile.getConfig()
      if (!newName) { new Notice(t('err.walletNameEmpty')); return }
      if (config.wallets.some(w => w.name === newName)) {
        new Notice(t('err.walletNameDuplicate')); return
      }
      if ((newType === 'cash' || newType === 'bank') && newBalance < 0) {
        new Notice(t('err.cashBankNegativeBalance')); return
      }
      if (newType === 'creditCard' && newBalance < 0) {
        new Notice(t('err.creditNegativeBalance')); return
      }
      const newWallet: Wallet = {
        name: newName,
        type: newType,
        initialBalance: newBalance,
        status: 'active',
        includeInNetAsset: true,
      }
      const wallets = [...config.wallets, newWallet]
      this.walletFile.updateConfig({ wallets })
      await this.walletFile.saveConfig()
      new Notice(tn('notice.walletAdded', { name: newName }))
      void this.display()
    }

    addBtn.addEventListener('click', () => { void submitAddWallet() })

    for (const inputEl of [nameInput, typeSelect, balanceInput]) {
      inputEl.addEventListener('keydown', (event) => {
        const keyboardEvent = event as KeyboardEvent
        if (keyboardEvent.key === 'Enter') {
          keyboardEvent.preventDefault()
          void submitAddWallet()
        }
      })
    }
  }

  private renderCategories() {
    const config = this.walletFile.getConfig()
    const { containerEl } = this

    new Setting(containerEl).setName(t('settings.customCategories')).setHeading()
    const cardEl = containerEl.createDiv('pw-card pw-category-card')

    this.renderCategorySection(
      cardEl,
      'expense',
      t('settings.expenseCategories'),
      config.options.categories.expense.custom,
      config.options.categories.income.custom,
      config.options.categories.expense.default,
      async (updated) => {
        const scrollTop = containerEl.closest<HTMLElement>('.vertical-tab-content')?.scrollTop ?? 0
        this.walletFile.updateCustomCategories('expense', updated)
        await this.walletFile.saveConfig()
        this.app.workspace.trigger('penny-wallet:refresh')
        this.display(scrollTop)
      },
    )

    cardEl.createEl('hr', { cls: 'pw-category-divider' })

    this.renderCategorySection(
      cardEl,
      'income',
      t('settings.incomeCategories'),
      config.options.categories.income.custom,
      config.options.categories.expense.custom,
      config.options.categories.income.default,
      async (updated) => {
        const scrollTop = containerEl.closest<HTMLElement>('.vertical-tab-content')?.scrollTop ?? 0
        this.walletFile.updateCustomCategories('income', updated)
        await this.walletFile.saveConfig()
        this.app.workspace.trigger('penny-wallet:refresh')
        this.display(scrollTop)
      },
    )
  }

  private renderCategorySection(
    container: HTMLElement,
    type: 'expense' | 'income',
    title: string,
    categories: string[],
    otherCategories: string[],
    defaultKeys: readonly string[],
    onChange: (updated: string[]) => void | Promise<void>,
  ) {
    container.createEl('div', { text: title, cls: 'pw-setting-input-subtitle' })

    const tagsEl = container.createDiv('pw-category-tags')
    for (const cat of categories) {
      const tag = tagsEl.createDiv('pw-category-tag')
      tag.createEl('span', { text: cat })
      const renameBtn = tag.createEl('button', { cls: 'pw-tag-rename', text: t('ui.edit') })
      renameBtn.addEventListener('click', () => {
        const modal = new CategoryRenameModal(this.app, cat, async (next) => {
          if (defaultKeys.includes(next))     { new Notice(t('err.categoryExists')); return }
          if (categories.includes(next))      { new Notice(t('err.categoryExists')); return }
          if (otherCategories.includes(next)) { new Notice(t('err.categoryExistsInOtherList')); return }
          const updatedCount = await this.walletFile.renameCustomCategory(type, cat, next)
          this.app.workspace.trigger('penny-wallet:refresh')
          new Notice(tn('notice.categoryRenamed', { old: cat, new: next, count: String(updatedCount) }))
          this.display()
        })
        modal.open()
      })
      const removeBtn = tag.createEl('button', { cls: 'pw-tag-remove' })
      const svg = removeBtn.createSvg('svg', { attr: { viewBox: '0 0 10 10', width: '10', height: '10', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' } })
      svg.createSvg('line', { attr: { x1: '2', y1: '2', x2: '8', y2: '8' } })
      svg.createSvg('line', { attr: { x1: '8', y1: '2', x2: '2', y2: '8' } })
      removeBtn.addEventListener('click', () => {
        void onChange(categories.filter(c => c !== cat))
      })
    }

    const addRow = container.createDiv('pw-category-add-row')
    const input = addRow.createEl('input', {
      type: 'text',
      placeholder: t('settings.categoryPlaceholder'),
      cls: 'pw-category-input',
    })
    const addBtn = addRow.createEl('button', { text: t('settings.addCategory'), cls: 'mod-cta' })
    addBtn.addEventListener('click', () => {
      const val = input.value.trim()
      if (!val) return
      if (defaultKeys.includes(val))     { new Notice(t('err.categoryExists')); return }
      if (categories.includes(val))      { new Notice(t('err.categoryExists')); return }
      if (otherCategories.includes(val)) { new Notice(t('err.categoryExistsInOtherList')); return }
      void onChange([...categories, val])
    })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addBtn.click()
    })
  }
}

// ─── Wallet Edit Modal ────────────────────────────────────────────────────────

class CategoryRenameModal extends Modal {
  private currentName: string
  private onSave: (next: string) => void | Promise<void>

  constructor(app: App, currentName: string, onSave: (next: string) => void | Promise<void>) {
    super(app)
    this.currentName = currentName
    this.onSave = onSave
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()
    contentEl.addClass('pw-modal')
    contentEl.createEl('h2', { text: tn('settings.renameCategoryPrompt', { name: this.currentName }) })

    const input = contentEl.createEl('input', {
      type: 'text',
      cls: 'pw-field-input',
      value: this.currentName,
    })

    const row = contentEl.createDiv('pw-modal-actions')
    const cancelBtn = row.createEl('button', { text: t('ui.cancel') })
    const saveBtn = row.createEl('button', { text: t('ui.save'), cls: 'mod-cta' })

    const submit = async () => {
      const next = input.value.trim()
      if (!next || next === this.currentName) {
        this.close()
        return
      }
      await this.onSave(next)
      this.close()
    }

    cancelBtn.addEventListener('click', () => this.close())
    saveBtn.addEventListener('click', () => { void submit() })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void submit()
      }
    })
    window.requestAnimationFrame(() => input.focus())
  }
}

class WalletEditModal extends Modal {
  private wallet: Wallet
  private onSave: (patch: Partial<Wallet>) => void | Promise<void>
  private name: string
  private balance: number

  constructor(app: App, wallet: Wallet, onSave: (patch: Partial<Wallet>) => void | Promise<void>) {
    super(app)
    this.wallet = wallet
    this.onSave = onSave
    this.name = wallet.name
    this.balance = wallet.initialBalance
  }

  onOpen() {
    const { contentEl, containerEl } = this
    containerEl.addClass('pw-wallet-edit-modal-container')
    contentEl.addClass('pw-modal')
    contentEl.createEl('h2', { text: t('ui.edit') })

    const formEl = contentEl.createDiv('pw-wallet-edit-form')
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
    const syncKeyboardState = () => {
      if (!isTouchDevice) return
      const activeEl = document.activeElement
      const isEditingFieldFocused = !!activeEl && formEl.contains(activeEl)
      if (isEditingFieldFocused) {
        containerEl.setCssProps({ 'padding-bottom': '40vh' })
      } else {
        containerEl.style.removeProperty('padding-bottom')
      }
    }

    formEl.addEventListener('focusin', syncKeyboardState)
    formEl.addEventListener('focusout', () => window.requestAnimationFrame(syncKeyboardState))

    const nameRow = formEl.createDiv('pw-wallet-edit-field')
    nameRow.createEl('label', { text: t('settings.walletName'), cls: 'pw-wallet-edit-label' })
    const nameInput = nameRow.createEl('input', { type: 'text', cls: 'pw-field-input' })
    nameInput.value = this.name
    nameInput.setAttribute('enterkeyhint', 'done')
    nameInput.addEventListener('input', () => { this.name = nameInput.value.trim() })
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur() })

    const balanceRow = formEl.createDiv('pw-wallet-edit-field')
    balanceRow.createEl('label', { text: t('settings.initialBalance'), cls: 'pw-wallet-edit-label' })
    const balInput = balanceRow.createEl('input', { type: 'number', cls: 'pw-field-input' })
    balInput.value = String(this.balance)
    balInput.setAttribute('min', '0')
    balInput.setAttribute('enterkeyhint', 'done')
    balInput.addEventListener('input', () => { this.balance = parseFloat(balInput.value) || 0 })
    balInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') balInput.blur() })

    formEl.createEl('p', {
      text: this.wallet.type === 'creditCard'
        ? t('settings.creditBalanceHint')
        : t('settings.cashBankBalanceHint'),
      cls: 'pw-balance-hint pw-wallet-edit-hint',
    })

    const btnRow = contentEl.createDiv('pw-btn-row')
    const saveBtn = btnRow.createEl('button', { text: t('ui.save'), cls: 'mod-cta' })
    saveBtn.dataset['action'] = 'save'
    saveBtn.addEventListener('click', () => {
      if (!this.name) { new Notice(t('err.walletNameEmpty')); return }
      if ((this.wallet.type === 'cash' || this.wallet.type === 'bank') && this.balance < 0) {
        new Notice(t('err.cashBankNegativeBalance')); return
      }
      if (this.wallet.type === 'creditCard' && this.balance < 0) {
        new Notice(t('err.creditNegativeBalanceShort')); return
      }
      void this.onSave({ name: this.name, initialBalance: this.balance })
      this.close()
    })
    const cancelBtn = btnRow.createEl('button', { text: t('ui.cancel') })
    cancelBtn.dataset['action'] = 'cancel'
    cancelBtn.addEventListener('click', () => this.close())
  }

  onClose() {
    this.containerEl.removeClass('pw-wallet-edit-modal-container')
    this.containerEl.style.removeProperty('padding-bottom')
    this.contentEl.empty()
  }
}
