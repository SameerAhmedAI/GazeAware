export default function ZoneBadge({ zone = 'GREEN' }) {
  const styles = {
    GREEN:    'bg-zone-green/10 text-zone-green border border-zone-green/20',
    YELLOW:   'bg-zone-yellow/10 text-zone-yellow border border-zone-yellow/20',
    RED:      'bg-zone-red/10 text-zone-red border border-zone-red/20',
    CRITICAL: 'bg-zone-critical/15 text-zone-critical border border-zone-critical/30 animate-[pulse-critical_2s_infinite]',
  }

  const style = styles[zone] ?? styles.GREEN

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 font-dm font-medium text-xs tracking-widest uppercase ${style}`}>
      {zone}
    </span>
  )
}
