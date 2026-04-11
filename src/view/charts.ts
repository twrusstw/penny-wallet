/**
 * Shared chart utilities for DashboardView and AssetView.
 */
import { formatAmount } from '../utils'
import { t, translateCategory } from '../i18n'

const PIE_COLORS = ['#D85A30','#378ADD','#7F77DD','#1D9E75','#EF9F27','#888780','#5DC8C8','#E8A0BF']

const C_INCOME  = '#1D9E75'
const C_EXPENSE = '#D85A30'
const C_NET     = '#7F77DD'

export interface MonthData {
  monthLabel: string
  tooltipLabel: string
  income: number
  expense: number
  net: number | null
}

// ─── Color helpers ────────────────────────────────────────────────────────────

export function getChartColors() {
  const dark = document.body.classList.contains('theme-dark')
  return {
    muted:     dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
    label:     dark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)',
    grid:      dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    baseline:  dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
    dotBorder: dark ? '#141413' : '#f5f4f0',
  }
}

export function formatK(n: number, dp: 0 | 2 = 0): string {
  return Math.abs(n) >= 10000
    ? (n / 1000).toFixed(0) + 'k'
    : Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

// ─── Legend helpers ───────────────────────────────────────────────────────────

export function addRectLegend(container: HTMLElement, color: string, label: string) {
  const item = container.createDiv('pw-leg')
  const rect = item.createEl('span', { cls: 'pw-leg-rect' })
  rect.setCssProps({ 'background-color': color })
  item.createEl('span', { text: label })
}

// ─── Tooltip helpers ──────────────────────────────────────────────────────────

export function buildTooltipRow(tooltip: HTMLElement, color: string, text: string) {
  const row = tooltip.createDiv('pw-tt-row')
  const dot = row.createEl('span')
  dot.setCssProps({ width: '9px', height: '7px', 'border-radius': '2px', background: color })
  row.appendText(text)
}

export function buildTooltipDot(tooltip: HTMLElement, color: string, text: string) {
  const row = tooltip.createDiv('pw-tt-row')
  const dot = row.createEl('span')
  dot.setCssProps({ width: '7px', height: '7px', 'border-radius': '50%', background: color })
  row.appendText(text)
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns last `count` months ending at (and including) `endYearMonth`. */
export function getMonthRangeEndingAt(endYearMonth: string, count: number): string[] {
  const [y, m] = endYearMonth.split('-').map(Number)
  const result: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1)
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return result
}

/** Returns the last `count` months ending at current month. */
export function getMonthRange(count: number): string[] {
  const result: string[] = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return result
}

// ─── Income / Expense bar chart ───────────────────────────────────────────────

export function drawIncExpChart(container: HTMLElement, tooltip: HTMLElement, data: MonthData[], dp: 0 | 2 = 0) {
  const canvas = container.createEl('canvas')
  canvas.setCssProps({ display: 'block' })

  const width    = container.clientWidth || 480
  const count    = data.length
  const incH0    = 130, expH0 = 95, padTop0 = 18, padBot0 = 28
  const defaultH = incH0 + expH0 + padTop0 + padBot0
  const availH   = container.clientHeight
  const s        = availH > 60 ? availH / defaultH : 1
  const incH     = incH0 * s, expH = expH0 * s
  const padTop   = padTop0 * s, padBot = padBot0 * s
  const totalH   = incH + expH + padTop + padBot
  const dpr      = window.devicePixelRatio || 1

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

  ctx.beginPath()
  ctx.strokeStyle = colorBaseline
  ctx.lineWidth = 0.5
  ctx.moveTo(leftPad, baselineY)
  ctx.lineTo(width - rightPad, baselineY)
  ctx.stroke()

  const incUsable = baselineY - padTop
  const expBase   = baselineY
  const expUsable = expH - 20 * s

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

  const hitAreas: { cx: number; d: MonthData }[] = []
  data.forEach((d, i) => {
    const cx = leftPad + colW * i + colW / 2
    const bx = cx - barW / 2

    const incBarH = d.income / maxInc * incUsable
    const incTop  = baselineY - incBarH
    ctx.fillStyle = C_INCOME
    ctx.fillRect(bx, incTop, barW, incBarH)
    if (d.income > 0) {
      ctx.fillStyle = colorLabel; ctx.font = `${labelSize}px sans-serif`; ctx.textAlign = 'center'
      ctx.fillText(formatK(d.income, dp), cx, incTop - 4)
    }

    const expBarH = d.expense / maxExp * expUsable
    ctx.fillStyle = C_EXPENSE
    ctx.fillRect(bx, expBase, barW, expBarH)
    if (d.expense > 0) {
      ctx.fillStyle = colorLabel; ctx.font = `${labelSize}px sans-serif`; ctx.textAlign = 'center'
      ctx.fillText(formatK(d.expense, dp), cx, expBase + expBarH + 11)
    }

    ctx.fillStyle = colorMuted; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(d.monthLabel, cx, totalH - 8)

    hitAreas.push({ cx, d })
  })

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

export function drawNetChart(container: HTMLElement, tooltip: HTMLElement, data: MonthData[], dp: 0 | 2 = 0) {
  const canvas = container.createEl('canvas')
  canvas.setCssProps({ display: 'block' })

  const width  = container.clientWidth  || 480
  const height = Math.max(container.clientHeight || 0, 150)
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

  for (let row = 0; row <= 3; row++) {
    const y = pad.t + (innerH / 3) * row
    ctx.beginPath(); ctx.strokeStyle = colorGrid; ctx.lineWidth = 0.5
    ctx.moveTo(pad.l, y); ctx.lineTo(width - pad.r, y); ctx.stroke()
    const val = Math.round(maxVal - (maxVal - minVal) / 3 * row)
    ctx.fillStyle = colorMuted; ctx.font = '10px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(formatK(val, dp), pad.l - 5, y + 3)
  }

  ctx.beginPath(); ctx.strokeStyle = C_NET; ctx.lineWidth = 2
  let started = false
  data.forEach((d, i) => {
    if (d.net === null) { started = false; return }
    if (started) ctx.lineTo(xOf(i), yOf(d.net))
    else { ctx.moveTo(xOf(i), yOf(d.net)); started = true }
  })
  ctx.stroke()

  data.forEach((d, i) => {
    ctx.fillStyle = colorMuted; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(d.monthLabel, xOf(i), height - 5)
    if (d.net !== null) {
      ctx.beginPath(); ctx.arc(xOf(i), yOf(d.net), 3, 0, Math.PI * 2)
      ctx.fillStyle = C_NET; ctx.fill()
      ctx.strokeStyle = dotBorder; ctx.lineWidth = 1.5; ctx.stroke()
    }
  })

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

// ─── Pie chart ────────────────────────────────────────────────────────────────

export function drawPie(
  container: HTMLElement,
  data: Map<string, number>,
  dp: 0 | 2 = 0,
  onSegmentClick?: (categoryKey: string) => void,
  size = 120,
) {
  const total = [...data.values()].reduce((a, b) => a + b, 0)

  const segments: { key: string; label: string; value: number; color: string; start: number; end: number }[] = []

  let angle = -Math.PI / 2
  let ci = 0

  for (const [key, value] of data) {
    const slice = (value / total) * Math.PI * 2
    segments.push({
      key,
      label: translateCategory(key),
      value,
      color: PIE_COLORS[ci % PIE_COLORS.length],
      start: angle,
      end: angle + slice,
    })
    angle += slice
    ci++
  }

  const pieWrap = container.createDiv('pw-pie-wrap')
  const SIZE = size
  const dpr = window.devicePixelRatio || 1
  const CX = SIZE / 2, CY = SIZE / 2
  const R = SIZE / 2 - 8
  const canvas = pieWrap.createEl('canvas')
  canvas.width = SIZE * dpr
  canvas.height = SIZE * dpr
  canvas.setCssProps({ width: SIZE + 'px', height: SIZE + 'px' })
  if (onSegmentClick) canvas.setCssProps({ cursor: 'pointer' })

  const tooltip = pieWrap.createDiv('pw-tooltip')
  tooltip.hide()

  function redraw(hiIdx: number) {
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, SIZE, SIZE)
    segments.forEach((seg, i) => {
      const expand = hiIdx === i ? 4 : 0
      ctx.beginPath()
      ctx.moveTo(CX, CY)
      ctx.arc(CX, CY, R + expand, seg.start, seg.end)
      ctx.closePath()
      ctx.fillStyle = seg.color
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
  }

  function hitTest(clientX: number, clientY: number): number {
    const rect = canvas.getBoundingClientRect()
    const dx = clientX - rect.left - CX
    const dy = clientY - rect.top - CY
    if (dx * dx + dy * dy > (R + 4) * (R + 4)) return -1
    let a = Math.atan2(dy, dx)
    if (a < -Math.PI / 2) a += Math.PI * 2
    return segments.findIndex(seg => a >= seg.start && a < seg.end)
  }

  function showTooltip(seg: (typeof segments)[0], clientX: number, clientY: number) {
    const pct = Math.round((seg.value / total) * 100)
    tooltip.setText(`${seg.label} ${pct}%`)
    const wrapRect = pieWrap.getBoundingClientRect()
    tooltip.setCssProps({
      left: (clientX - wrapRect.left + 12) + 'px',
      top:  (clientY - wrapRect.top  - 8)  + 'px',
    })
    tooltip.show()
  }

  redraw(-1)

  canvas.addEventListener('mousemove', (e) => {
    const idx = hitTest(e.clientX, e.clientY)
    redraw(idx)
    if (idx >= 0) showTooltip(segments[idx], e.clientX, e.clientY)
    else tooltip.hide()
  })

  canvas.addEventListener('mouseleave', () => {
    redraw(-1)
    tooltip.hide()
  })

  if (onSegmentClick) {
    canvas.addEventListener('click', (e) => {
      const idx = hitTest(e.clientX, e.clientY)
      if (idx >= 0) onSegmentClick(segments[idx].key)
    })

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      const idx = hitTest(touch.clientX, touch.clientY)
      if (idx < 0) return
      redraw(idx)
      showTooltip(segments[idx], touch.clientX, touch.clientY)
      setTimeout(() => {
        tooltip.hide()
        redraw(-1)
        onSegmentClick(segments[idx].key)
      }, 600)
    }, { passive: false })
  }

  const legend = pieWrap.createDiv('pw-pie-legend')
  segments.forEach((seg) => {
    const item = legend.createDiv('pw-legend-item')
    if (onSegmentClick) {
      item.setCssProps({ cursor: 'pointer' })
      item.addEventListener('click', () => onSegmentClick(seg.key))
    }
    const dot = item.createEl('span', { cls: 'pw-legend-dot' })
    dot.setCssProps({ 'background-color': seg.color })
    item.createEl('span', { text: seg.label, cls: 'pw-legend-name' })
    item.createEl('span', { text: formatAmount(seg.value, dp), cls: 'pw-legend-amt' })
    const pct = Math.round((seg.value / total) * 100)
    item.createEl('span', { text: `${pct}%`, cls: 'pw-legend-pct' })
  })
}
