import type { Evidence } from '../game/types'

/** Provider formatting is flexible; accepted facts and source IDs are not. */
export function verifiedRecap(text: string, earned: Pick<Evidence, 'id' | 'body'>[]) {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const parsed: unknown = JSON.parse(clean)
  if (!parsed || typeof parsed !== 'object' || !('observations' in parsed) || !Array.isArray(parsed.observations)) return []
  const seen = new Set<string>()
  // Models may replace curly quotation marks with straight ASCII marks.
  // This one-character mapping preserves offsets; always return the authored text.
  const punctuation = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  const observations: { evidenceId: string; quote: string }[] = []
  for (const item of parsed.observations) {
    if (!item || typeof item !== 'object' || typeof item.evidenceId !== 'string' || typeof item.quote !== 'string') continue
    const source = earned.find(c => c.id === item.evidenceId)
    const offset = source ? punctuation(source.body).indexOf(punctuation(item.quote)) : -1
    if (!source || item.quote.length < 20 || item.quote.length > 260 || offset < 0 || seen.has(source.id)) continue
    seen.add(source.id)
    observations.push({ evidenceId: item.evidenceId, quote: source.body.slice(offset, offset + item.quote.length) })
    if (observations.length === 4) break
  }
  return observations
}
