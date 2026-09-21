const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
]

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

/** "3 minutes ago", "yesterday", "2 months ago". */
export function formatRelativeTime(timestamp: number, now = Date.now()) {
  let duration = (timestamp - now) / 1000

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relative.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }

  return relative.format(Math.round(duration), "year")
}

/** "now", "5m", "3h", "2d", "3w", "4mo", "1y" — the card meta row has no room for words. */
export function formatShortAge(timestamp: number, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000))
  if (seconds < 60) return "now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks}w`
  const months = Math.round(days / 30.44)
  if (months < 12) return `${months}mo`
  return `${Math.round(days / 365.25)}y`
}
