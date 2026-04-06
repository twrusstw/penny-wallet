export function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function stepMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function isAfterCurrentMonth(ym: string): boolean {
  return ym > currentYearMonth()
}

export function formatAmount(n: number, dp: 0 | 2 = 0): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

export function createMetric(container: HTMLElement, label: string, value: number, cls: string, dp: 0 | 2 = 0) {
  const card = container.createDiv('pw-metric')
  card.createEl('div', { text: label, cls: 'pw-metric-label' })
  const prefix = cls === 'income' || cls === 'positive' ? '+' : cls === 'expense' || cls === 'negative' ? '-' : ''
  card.createEl('div', {
    text: prefix + formatAmount(Math.abs(value), dp),
    cls: `pw-metric-value ${cls}`,
  })
}
