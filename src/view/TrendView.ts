import { Events, ItemView, WorkspaceLeaf } from 'obsidian'
import { WalletFile } from '../io/WalletFile'
import { t, formatMonthLabel, formatYearMonth, translateCategory } from '../i18n'
import { createMetric } from '../utils'

export const TREND_VIEW_TYPE = 'penny-wallet-trend'

const C_INCOME  = '#1D9E75'
const C_EXPENSE = '#D85A30'
const C_NET     = '#7F77DD'

interface MonthData {
  monthLabel: string
  tooltipLabel: string
  income: number
  expense: number
  net: number | null
}

export class TrendView extends ItemView {
  private walletFile: WalletFile
  private range: number = 6
  private selectedCategory: string = ''
  private catChartWrap: HTMLElement | null = null
  private catTotalEl: HTMLElement | null = null
  private catMonths: string[] = []
  private catBaseData: MonthData[] = []
  private catDp: 0 | 2 = 0

  constructor(leaf: WorkspaceLeaf, walletFile: WalletFile) {
    super(leaf)
    this.walletFile = walletFile
  }

  getViewType() { return TREND_VIEW_TYPE }
  getDisplayText() { return t('trend.title') }
  getIcon() { return 'pw-icon' }

  async onOpen() {
    this.registerEvent(
      (this.app.workspace as Events).on('penny-wallet:refresh', () => { void this.render() })
    )
    await this.render()
  }

  onClose(): Promise<void> {
    this.contentEl.empty()
    return Promise.resolve()
  }

  async render() {
    const { contentEl } = this
    contentEl.empty()
    contentEl.addClass('pw-trend')

    const months = getMonthRange(this.range)
    const [summaries, netTimeline] = await Promise.all([
      this.walletFile.getMonthSummaries(months),
      this.walletFile.getNetAssetTimeline(months),
    ])

    // ── Range buttons ────────────────────────────────────────────────────────
    const rangeRow = contentEl.createDiv('pw-range-row')
    for (const r of [3, 6, 12]) {
      rangeRow.createEl('button', {
        text: t(`trend.${r}m` as 'trend.3m' | 'trend.6m' | 'trend.12m'),
        cls: 'pw-range-btn' + (this.range === r ? ' is-active' : ''),
      }).addEventListener('click', () => {
        this.range = r
        void this.render()
      })
    }

    // ── Build data array ─────────────────────────────────────────────────────
    const data: MonthData[] = months.map(ym => ({
      monthLabel: formatMonthLabel(ym),
      tooltipLabel: formatYearMonth(ym, 'short'),
      income: summaries.get(ym)?.income ?? 0,
      expense: summaries.get(ym)?.expense ?? 0,
      net: netTimeline.get(ym) ?? null,
    }))

    const dp = this.walletFile.getConfig().decimalPlaces ?? 0

    // ── Income / Expense bar chart ───────────────────────────────────────────
    const incExpCard = contentEl.createDiv('pw-card')
    incExpCard.createEl('div', { text: t('trend.monthlyIncomeExpense'), cls: 'pw-card-title' })
    const legRow1 = incExpCard.createDiv('pw-leg-row')
    addRectLegend(legRow1, C_INCOME, t('dash.income'))
    addRectLegend(legRow1, C_EXPENSE, t('dash.expense'))
    const chartWrap1 = incExpCard.createDiv('pw-chart-wrap')
    const tooltip1 = chartWrap1.createDiv('pw-tooltip')
    requestAnimationFrame(() => drawIncExpChart(chartWrap1, tooltip1, data, dp))

    // ── Category trend ───────────────────────────────────────────────────────
    const options = this.walletFile.getConfig().options
    const expenseCats = [...options.categories.expense.default, ...options.categories.expense.custom]
    const incomeCats  = [...options.categories.income.default,  ...options.categories.income.custom]

    if (!this.selectedCategory) this.selectedCategory = expenseCats[0] ?? ''

    const catCard = contentEl.createDiv('pw-card')
    catCard.createEl('div', { text: t('trend.categoryTrend'), cls: 'pw-card-title' })

    const catRow = catCard.createDiv('pw-cat-trend-row')
    const catSel = catRow.createEl('select', { cls: 'pw-cat-trend-sel' })

    const addOptGroup = (label: string, cats: string[]) => {
      const grp = catSel.createEl('optgroup')
      grp.label = label
      for (const cat of cats) {
        const opt = catSel.createEl('option', { text: translateCategory(cat), value: cat })
        if (cat === this.selectedCategory) opt.selected = true
      }
    }
    addOptGroup(t('detail.filterExpense'), expenseCats)
    addOptGroup(t('detail.filterIncome'),  incomeCats)

    this.catChartWrap = catCard.createDiv('pw-chart-wrap')
    this.catMonths    = months
    this.catBaseData  = data
    this.catDp        = dp

    const totalEl = catRow.createEl('span', { cls: 'pw-cat-trend-total' })
    this.catTotalEl = totalEl

    await this.updateCatChart()

    catSel.addEventListener('change', () => {
      this.selectedCategory = catSel.value
      void this.updateCatChart()
    })

    // ── Net asset line chart ─────────────────────────────────────────────────
    const netCard = contentEl.createDiv('pw-card')
    netCard.createEl('div', { text: t('trend.netAssetTrend'), cls: 'pw-card-title' })
    const chartWrap2 = netCard.createDiv('pw-chart-wrap')
    const tooltip2 = chartWrap2.createDiv('pw-tooltip')
    requestAnimationFrame(() => drawNetChart(chartWrap2, tooltip2, data, dp))

    // ── Wallet balance trend ─────────────────────────────────────────────────
    const walletTrend = await this.walletFile.getWalletBalanceTrend(months)
    if (walletTrend.size >= 2) {
      const walletCard = contentEl.createDiv('pw-card')
      walletCard.createEl('div', { text: t('trend.walletBalanceTrend'), cls: 'pw-card-title' })

      const walletLegRow = walletCard.createDiv('pw-leg-row')
      const walletNames = [...walletTrend.keys()]
      const walletColors = ['#378ADD', '#1D9E75', '#EF9F27', '#7F77DD', '#D85A30', '#5DC8C8']
      walletNames.forEach((name, i) => addRectLegend(walletLegRow, walletColors[i % walletColors.length], name))

      const walletChartWrap = walletCard.createDiv('pw-chart-wrap')
      const walletTooltip = walletChartWrap.createDiv('pw-tooltip')
      requestAnimationFrame(() =>
        drawWalletTrendChart(walletChartWrap, walletTooltip, months, data, walletTrend, walletColors, dp)
      )
    }

    // ── Summary metrics ──────────────────────────────────────────────────────
    const activeData = data.filter(d => d.income > 0 || d.expense > 0)
    const avgIncome  = activeData.length ? average(activeData.map(d => d.income))  : 0
    const avgExpense = activeData.length ? average(activeData.map(d => d.expense)) : 0
    const netValues  = data.map(d => d.net).filter((d): d is number => d !== null)
    const netChange  = netValues.length >= 2 ? netValues[netValues.length - 1] - netValues[0] : 0

    const metricsEl = contentEl.createDiv('pw-metrics')
    createMetric(metricsEl, t('trend.avgIncome'),     avgIncome,  'income',   2)
    createMetric(metricsEl, t('trend.avgExpense'),    avgExpense, 'expense',  2)
    createMetric(metricsEl, t('trend.netAssetChange'), netChange, netChange >= 0 ? 'positive' : 'negative', 2)
  }

  private async updateCatChart() {
    if (!this.catChartWrap || !this.catTotalEl) return
    const config      = this.walletFile.getConfig().options
    const incomeCats  = [...config.categories.income.default, ...config.categories.income.custom]
    const catTrend    = await this.walletFile.getCategoryTrend(this.catMonths, this.selectedCategory)
    const catAmounts  = this.catMonths.map(ym => catTrend.get(ym) ?? 0)
    const rangeTotal  = catAmounts.reduce((a, b) => a + b, 0)
    const catColor    = incomeCats.includes(this.selectedCategory) ? C_INCOME : C_EXPENSE

    this.catChartWrap.empty()
    const catTooltip = this.catChartWrap.createDiv('pw-tooltip')
    requestAnimationFrame(() =>
      drawCatChart(
        this.catChartWrap!,
        catTooltip,
        this.catBaseData.map((d, i) => ({ ...d, catAmount: catAmounts[i] })),
        this.catDp,
        catColor,
      )
    )
    this.catTotalEl.setText(
      `${t('trend.rangeTotal')}: ${rangeTotal.toLocaleString(undefined, { minimumFractionDigits: this.catDp, maximumFractionDigits: this.catDp })}`
    )
  }
}

// ─── Income / Expense bar chart ───────────────────────────────────────────────

function drawIncExpChart(container: HTMLElement, tooltip: HTMLElement, data: MonthData[], dp: 0 | 2 = 0) {
  const canvas = container.createEl('canvas')
  canvas.setCssProps({ display: 'block' })

  const width   = container.clientWidth || 480
  const count   = data.length
  const incH    = 130, expH = 95, padTop = 18, padBot = 28
  const totalH  = incH + expH + padTop + padBot
  const dpr     = window.devicePixelRatio || 1

  canvas.width  = width * dpr
  canvas.height = totalH * dpr
  canvas.setCssProps({ width: width + 'px', height: totalH + 'px' })

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  const leftPad  = 40
  const rightPad = 6
  const colW     = (width - leftPad - rightPad) / count
  const barW     = Math.min(30, colW * 0.48)
  const baselineY = incH + padTop / 2
  const labelSize = count > 6 ? 9 : 10

  const { muted: colorMuted, label: colorLabel, grid: colorGrid, baseline: colorBaseline } = getChartColors()

  const maxInc = Math.max(...data.map(d => d.income), 1)
  const maxExp = Math.max(...data.map(d => d.expense), 1)

  ctx.clearRect(0, 0, width, totalH)

  // Baseline
  ctx.beginPath()
  ctx.strokeStyle = colorBaseline
  ctx.lineWidth = 0.5
  ctx.moveTo(leftPad, baselineY)
  ctx.lineTo(width - rightPad, baselineY)
  ctx.stroke()

  // Grid lines + Y-axis labels — income side
  const incUsable = baselineY - padTop
  const expBase   = baselineY
  const expUsable = expH - 20

  // Zero label at baseline
  ctx.fillStyle = colorMuted; ctx.font = '9px sans-serif'; ctx.textAlign = 'right'
  ctx.fillText('0', leftPad - 4, baselineY + 3)

  for (const frac of [0.5, 1]) {
    const y = baselineY - incUsable * frac
    ctx.beginPath(); ctx.strokeStyle = colorGrid; ctx.lineWidth = 0.5
    ctx.moveTo(leftPad, y); ctx.lineTo(width - rightPad, y); ctx.stroke()
    ctx.fillStyle = colorMuted; ctx.font = '9px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(formatK(Math.round(maxInc * frac), dp), leftPad - 4, y + 3)
  }
  for (const frac of [0.5, 1]) {
    const y = expBase + expUsable * frac
    ctx.beginPath(); ctx.strokeStyle = colorGrid; ctx.lineWidth = 0.5
    ctx.moveTo(leftPad, y); ctx.lineTo(width - rightPad, y); ctx.stroke()
    ctx.fillStyle = colorMuted; ctx.font = '9px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(formatK(Math.round(maxExp * frac), dp), leftPad - 4, y + 3)
  }

  // Bars + value labels
  const hitAreas: { cx: number; d: MonthData }[] = []
  data.forEach((d, i) => {
    const cx = leftPad + colW * i + colW / 2
    const bx = cx - barW / 2

    // Income bar (upward from baseline)
    const incBarH = d.income / maxInc * incUsable
    const incTop  = baselineY - incBarH
    ctx.fillStyle = C_INCOME
    ctx.fillRect(bx, incTop, barW, incBarH)
    if (d.income > 0) {
      ctx.fillStyle = colorLabel; ctx.font = `${labelSize}px sans-serif`; ctx.textAlign = 'center'
      ctx.fillText(formatK(d.income, dp), cx, incTop - 4)
    }

    // Expense bar (downward from baseline)
    const expBarH = d.expense / maxExp * expUsable
    ctx.fillStyle = C_EXPENSE
    ctx.fillRect(bx, expBase, barW, expBarH)
    if (d.expense > 0) {
      ctx.fillStyle = colorLabel; ctx.font = `${labelSize}px sans-serif`; ctx.textAlign = 'center'
      ctx.fillText(formatK(d.expense, dp), cx, expBase + expBarH + 11)
    }

    // Month label (X-axis at bottom)
    ctx.fillStyle = colorMuted; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(d.monthLabel, cx, totalH - 8)

    hitAreas.push({ cx, d })
  })

  // Tooltip
  canvas.addEventListener('mousemove', (e) => {
    const rect  = canvas.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left) * (width / rect.width)
    const col   = Math.floor((mouseX - leftPad) / colW)
    if (col >= 0 && col < hitAreas.length) {
      const { cx, d } = hitAreas[col]
      tooltip.empty()
      tooltip.createDiv('pw-tt-month').setText(d.tooltipLabel)
      buildTooltipRow(tooltip, C_INCOME, `${t('dash.income')}: ${d.income.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}`)
      buildTooltipRow(tooltip, C_EXPENSE, `${t('dash.expense')}: ${d.expense.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}`)
      tooltip.show()
      tooltip.setCssProps({ left: Math.min(cx + 8, width - 140) + 'px', top: '8px' })
    } else {
      tooltip.hide()
    }
  })
  canvas.addEventListener('mouseleave', () => { tooltip.hide() })
}

// ─── Net asset line chart ─────────────────────────────────────────────────────

function drawNetChart(container: HTMLElement, tooltip: HTMLElement, data: MonthData[], dp: 0 | 2 = 0) {
  const canvas = container.createEl('canvas')
  canvas.setCssProps({ display: 'block' })

  const width  = container.clientWidth || 480
  const height = 150
  const dpr    = window.devicePixelRatio || 1

  canvas.width  = width  * dpr
  canvas.height = height * dpr
  canvas.setCssProps({ width: width + 'px', height: height + 'px' })

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  const pad = { t: 12, r: 14, b: 26, l: 46 }
  const innerW = width  - pad.l - pad.r
  const innerH = height - pad.t - pad.b

  const netValues = data.map(d => d.net).filter((d): d is number => d !== null)
  if (netValues.length === 0) return

  const rawMin  = Math.min(...netValues)
  const rawMax  = Math.max(...netValues)
  const padding = (rawMax - rawMin) * 0.1 || Math.abs(rawMax) * 0.1 || 10
  const minVal  = rawMin - padding
  const maxVal  = rawMax + padding
  const range   = maxVal - minVal

  const { muted: colorMuted, grid: colorGrid, dotBorder } = getChartColors()

  const xOf = (i: number) => pad.l + (i / (data.length - 1 || 1)) * innerW
  const yOf = (v: number) => pad.t + innerH - ((v - minVal) / range) * innerH

  ctx.clearRect(0, 0, width, height)

  // Grid lines + Y labels
  for (let row = 0; row <= 3; row++) {
    const y = pad.t + (innerH / 3) * row
    ctx.beginPath(); ctx.strokeStyle = colorGrid; ctx.lineWidth = 0.5
    ctx.moveTo(pad.l, y); ctx.lineTo(width - pad.r, y); ctx.stroke()
    const val = Math.round(maxVal - (maxVal - minVal) / 3 * row)
    ctx.fillStyle = colorMuted; ctx.font = '10px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(formatK(val, dp), pad.l - 5, y + 3)
  }

  // Line
  ctx.beginPath(); ctx.strokeStyle = C_NET; ctx.lineWidth = 2
  let started = false
  data.forEach((d, i) => {
    if (d.net === null) { started = false; return }
    if (started) ctx.lineTo(xOf(i), yOf(d.net))
    else { ctx.moveTo(xOf(i), yOf(d.net)); started = true }
  })
  ctx.stroke()

  // Dots + month labels
  data.forEach((d, i) => {
    ctx.fillStyle = colorMuted; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(d.monthLabel, xOf(i), height - 5)
    if (d.net !== null) {
      ctx.beginPath(); ctx.arc(xOf(i), yOf(d.net), 3, 0, Math.PI * 2)
      ctx.fillStyle = C_NET; ctx.fill()
      ctx.strokeStyle = dotBorder; ctx.lineWidth = 1.5; ctx.stroke()
    }
  })

  // Tooltip
  canvas.addEventListener('mousemove', (e) => {
    const rect   = canvas.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left) * (width / rect.width)
    let closest = 0, minDist = Infinity
    data.forEach((_, i) => {
      const dist = Math.abs(xOf(i) - mouseX)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    if (minDist < 28 && data[closest].net !== null) {
      tooltip.empty()
      tooltip.createDiv('pw-tt-month').setText(data[closest].tooltipLabel)
      buildTooltipDot(tooltip, C_NET, `${t('dash.netAsset')}: ${data[closest].net!.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}`)
      tooltip.show()
      tooltip.setCssProps({ left: Math.min(xOf(closest) + 8, width - 130) + 'px', top: yOf(data[closest].net!) - 42 + 'px' })
    } else {
      tooltip.hide()
    }
  })
  canvas.addEventListener('mouseleave', () => { tooltip.hide() })
}

// ─── Category trend line chart ────────────────────────────────────────────────

function drawCatChart(
  container: HTMLElement,
  tooltip: HTMLElement,
  data: Array<MonthData & { catAmount: number }>,
  dp: 0 | 2,
  color: string,
) {
  const canvas = container.createEl('canvas')
  canvas.setCssProps({ display: 'block' })

  const width  = container.clientWidth || 480
  const height = 150
  const dpr    = window.devicePixelRatio || 1

  canvas.width  = width  * dpr
  canvas.height = height * dpr
  canvas.setCssProps({ width: width + 'px', height: height + 'px' })

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  const pad = { t: 12, r: 14, b: 26, l: 46 }
  const innerW = width  - pad.l - pad.r
  const innerH = height - pad.t - pad.b

  const amounts  = data.map(d => d.catAmount)
  const maxVal   = Math.max(...amounts, 1) * 1.1
  const minVal   = 0

  const { muted: colorMuted, grid: colorGrid, dotBorder } = getChartColors()

  const xOf = (i: number) => pad.l + (i / (data.length - 1 || 1)) * innerW
  const yOf = (v: number) => pad.t + innerH - ((v - minVal) / (maxVal - minVal)) * innerH

  ctx.clearRect(0, 0, width, height)

  // Grid + Y labels
  for (let row = 0; row <= 3; row++) {
    const y   = pad.t + (innerH / 3) * row
    const val = Math.round(maxVal - (maxVal / 3) * row)
    ctx.beginPath(); ctx.strokeStyle = colorGrid; ctx.lineWidth = 0.5
    ctx.moveTo(pad.l, y); ctx.lineTo(width - pad.r, y); ctx.stroke()
    ctx.fillStyle = colorMuted; ctx.font = '10px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(formatK(val, dp), pad.l - 5, y + 3)
  }

  // Line
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2
  data.forEach((d, i) => {
    if (i === 0) ctx.moveTo(xOf(i), yOf(d.catAmount))
    else ctx.lineTo(xOf(i), yOf(d.catAmount))
  })
  ctx.stroke()

  // Dots + X labels
  data.forEach((d, i) => {
    ctx.fillStyle = colorMuted; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(d.monthLabel, xOf(i), height - 5)
    ctx.beginPath(); ctx.arc(xOf(i), yOf(d.catAmount), 3, 0, Math.PI * 2)
    ctx.fillStyle = color; ctx.fill()
    ctx.strokeStyle = dotBorder; ctx.lineWidth = 1.5; ctx.stroke()
  })

  // Tooltip
  canvas.addEventListener('mousemove', (e) => {
    const rect   = canvas.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left) * (width / rect.width)
    let closest = 0, minDist = Infinity
    data.forEach((_, i) => {
      const dist = Math.abs(xOf(i) - mouseX)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    if (minDist < 28) {
      const d = data[closest]
      tooltip.empty()
      tooltip.createDiv('pw-tt-month').setText(d.tooltipLabel)
      buildTooltipRow(tooltip, color, d.catAmount.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp }))
      tooltip.show()
      tooltip.setCssProps({ left: Math.min(xOf(closest) + 8, width - 130) + 'px', top: yOf(d.catAmount) - 42 + 'px' })
    } else {
      tooltip.hide()
    }
  })
  canvas.addEventListener('mouseleave', () => { tooltip.hide() })
}

// ─── Wallet balance trend chart ───────────────────────────────────────────────

function drawWalletTrendChart(
  container: HTMLElement,
  tooltip: HTMLElement,
  months: string[],
  data: MonthData[],
  walletTrend: Map<string, Map<string, number>>,
  colors: string[],
  dp: 0 | 2,
) {
  const canvas = container.createEl('canvas')
  canvas.setCssProps({ display: 'block' })

  const width  = container.clientWidth || 480
  const height = 160
  const dpr    = window.devicePixelRatio || 1

  canvas.width  = width  * dpr
  canvas.height = height * dpr
  canvas.setCssProps({ width: width + 'px', height: height + 'px' })

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  const pad = { t: 12, r: 14, b: 26, l: 52 }
  const innerW = width  - pad.l - pad.r
  const innerH = height - pad.t - pad.b

  const walletNames = [...walletTrend.keys()]
  const allValues   = walletNames.flatMap(name => months.map(ym => walletTrend.get(name)!.get(ym) ?? 0))
  const rawMin  = Math.min(...allValues)
  const rawMax  = Math.max(...allValues)
  const padding = (rawMax - rawMin) * 0.1 || Math.abs(rawMax) * 0.1 || 10
  const minVal  = rawMin - padding
  const maxVal  = rawMax + padding
  const range   = maxVal - minVal

  const { muted: colorMuted, grid: colorGrid, dotBorder } = getChartColors()

  const xOf = (i: number) => pad.l + (i / (months.length - 1 || 1)) * innerW
  const yOf = (v: number) => pad.t + innerH - ((v - minVal) / range) * innerH

  ctx.clearRect(0, 0, width, height)

  // Grid + Y labels
  for (let row = 0; row <= 3; row++) {
    const y   = pad.t + (innerH / 3) * row
    const val = Math.round(maxVal - (maxVal - minVal) / 3 * row)
    ctx.beginPath(); ctx.strokeStyle = colorGrid; ctx.lineWidth = 0.5
    ctx.moveTo(pad.l, y); ctx.lineTo(width - pad.r, y); ctx.stroke()
    ctx.fillStyle = colorMuted; ctx.font = '10px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(formatK(val, dp), pad.l - 5, y + 3)
  }

  // Lines + dots per wallet
  walletNames.forEach((name, wi) => {
    const color = colors[wi % colors.length]
    const vals  = months.map(ym => walletTrend.get(name)!.get(ym) ?? 0)

    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2
    vals.forEach((v, i) => {
      if (i === 0) ctx.moveTo(xOf(i), yOf(v))
      else ctx.lineTo(xOf(i), yOf(v))
    })
    ctx.stroke()

    vals.forEach((v, i) => {
      ctx.beginPath(); ctx.arc(xOf(i), yOf(v), 3, 0, Math.PI * 2)
      ctx.fillStyle = color; ctx.fill()
      ctx.strokeStyle = dotBorder; ctx.lineWidth = 1.5; ctx.stroke()
    })
  })

  // X labels
  data.forEach((d, i) => {
    ctx.fillStyle = colorMuted; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(d.monthLabel, xOf(i), height - 5)
  })

  // Tooltip
  canvas.addEventListener('mousemove', (e) => {
    const rect   = canvas.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left) * (width / rect.width)
    let closest = 0, minDist = Infinity
    months.forEach((_, i) => {
      const dist = Math.abs(xOf(i) - mouseX)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    if (minDist < 28) {
      const ym = months[closest]
      tooltip.empty()
      tooltip.createDiv('pw-tt-month').setText(data[closest].tooltipLabel)
      walletNames.forEach((name, wi) => {
        const val = walletTrend.get(name)!.get(ym) ?? 0
        const color = colors[wi % colors.length]
        buildTooltipRow(tooltip, color, `${name}: ${val.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}`)
      })
      tooltip.show()
      tooltip.setCssProps({ left: Math.min(xOf(closest) + 8, width - 160) + 'px', top: '8px' })
    } else {
      tooltip.hide()
    }
  })
  canvas.addEventListener('mouseleave', () => { tooltip.hide() })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a tooltip row with a rectangular color swatch (bar chart style) */
function buildTooltipRow(tooltip: HTMLElement, color: string, text: string) {
  const row = tooltip.createDiv('pw-tt-row')
  const dot = row.createEl('span')
  dot.setCssProps({ width: '9px', height: '7px', 'border-radius': '2px', background: color })
  row.appendText(text)
}

/** Build a tooltip row with a circular color dot (line chart style) */
function buildTooltipDot(tooltip: HTMLElement, color: string, text: string) {
  const row = tooltip.createDiv('pw-tt-row')
  const dot = row.createEl('span')
  dot.setCssProps({ width: '7px', height: '7px', 'border-radius': '50%', background: color })
  row.appendText(text)
}

function getChartColors() {
  const dark = document.body.classList.contains('theme-dark')
  return {
    muted:     dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
    label:     dark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)',
    grid:      dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    baseline:  dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
    dotBorder: dark ? '#141413' : '#f5f4f0',
  }
}

function getMonthRange(count: number): string[] {
  const result: string[] = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return result
}

function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function formatK(n: number, dp: 0 | 2 = 0): string {
  return Math.abs(n) >= 10000
    ? (n / 1000).toFixed(0) + 'k'
    : Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

function addRectLegend(container: HTMLElement, color: string, label: string) {
  const item = container.createDiv('pw-leg')
  const rect = item.createEl('span', { cls: 'pw-leg-rect' })
  rect.setCssProps({ 'background-color': color })
  item.createEl('span', { text: label })
}
