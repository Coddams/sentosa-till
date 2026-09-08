/**
 * Sentosa billing cycle: 28th of previous month → 27th of current month.
 * Returns { start, end } as YYYY-MM-DD strings for use in date inputs.
 */
export function getBillingCycle(date = new Date()) {
  const d = new Date(date)
  let cycleStart, cycleEnd

  if (d.getDate() >= 28) {
    // 28th or later — cycle started this month's 28th, ends next month's 27th
    cycleStart = new Date(d.getFullYear(), d.getMonth(), 28)
    cycleEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 27)
  } else {
    // 1st–27th — cycle started last month's 28th, ends this month's 27th
    cycleStart = new Date(d.getFullYear(), d.getMonth() - 1, 28)
    cycleEnd   = new Date(d.getFullYear(), d.getMonth(), 27)
  }

  return {
    start: toDateStr(cycleStart),
    end:   toDateStr(cycleEnd),
  }
}

/** Previous cycle (one cycle back from current) */
export function getPreviousCycle(date = new Date()) {
  const { start } = getBillingCycle(date)
  // Go one day before this cycle's start to land in the previous cycle
  const prev = new Date(start)
  prev.setDate(prev.getDate() - 1)
  return getBillingCycle(prev)
}

/** Format YYYY-MM-DD → "28 May", "27 Jun" etc. */
export function formatCycleDate(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Date → YYYY-MM-DD in local time */
export function toDateStr(date) {
  const d = new Date(date)
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

/** Today as YYYY-MM-DD */
export function today() {
  return toDateStr(new Date())
}
