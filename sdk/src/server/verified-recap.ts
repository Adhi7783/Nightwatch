import type { Evidence } from '../game/types'

/** Provider formatting is flexible; accepted facts and source IDs are not. */
export function verifiedRecap(text: string, earned: Pick<Evidence, 'id' | 'body'>[]) {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const parsed: unknown = JSON.parse(clean)
  if (!parsed || typeof parsed !== 'object' || !('observations' in parsed) || !Array.isArray(parsed.observations)) return []
  const seen = new Set<string>()
  const observations: { evidenceId: string; quote: string }[] = []
  for (const item of parsed.observations) {
    if (!item || typeof item !== 'object' || typeof item.evidenceId !== 'string' || typeof item.quote !== 'string') continue
    const source = earned.find(c => c.id === item.evidenceId)
    if (!source || item.quote.length < 20 || item.quote.length > 260 || !source.body.includes(item.quote) || seen.has(source.id)) continue
    seen.add(source.id)
    observations.push({ evidenceId: item.evidenceId, quote: item.quote })
    if (observations.length === 4) break
  }
  return observations
}
