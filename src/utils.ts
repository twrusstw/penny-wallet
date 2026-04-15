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

// CJK Unified Ideographs (Traditional/Simplified Chinese)
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/

export function validateTag(tag: string): boolean {
  if (!tag.trim()) return false
  if (tag.includes(',') || tag.includes('|')) return false
  const hasCjk = CJK_RE.test(tag)
  const len = [...tag].length
  return hasCjk ? len <= 5 : len <= 10
}
