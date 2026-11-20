import type { Theory } from './types'

export function validateTheory(
  input: Record<string, unknown>,
  allowed: { suspects: string[]; methods: string[]; motives: string[]; evidence: string[] },
  shared: string[],
): Theory {
  if (
    !allowed.suspects.includes(String(input.suspect)) ||
    !allowed.methods.includes(String(input.method)) ||
    !allowed.motives.includes(String(input.motive))
  )
    throw new Error('Choose a valid suspect, method, and motive.')
  if (
    !Array.isArray(input.evidence) ||
    input.evidence.length < 1 ||
    input.evidence.length > allowed.evidence.length ||
    input.evidence.some(
      (id) => typeof id !== 'string' || !allowed.evidence.includes(id) || !shared.includes(id),
    )
  )
    throw new Error('Select valid evidence already shared with the room.')
  if (new Set(input.evidence).size !== input.evidence.length)
    throw new Error('Select each supporting evidence item only once.')
  if (
    typeof input.explanation !== 'string' ||
    input.explanation.trim().length < 10 ||
    input.explanation.length > 1000
  )
    throw new Error('Explain your theory in 10–1,000 characters.')
  return {
    suspect: String(input.suspect),
    method: String(input.method),
    motive: String(input.motive),
    evidence: input.evidence,
    explanation: input.explanation.trim(),
  }
}

export function matchesSolution(
  theory: Theory,
  answer: { suspect: string; method: string; motive: string; required: string[] },
): boolean {
  return (
    theory.suspect === answer.suspect &&
    theory.method === answer.method &&
    theory.motive === answer.motive &&
    answer.required.every((id) => theory.evidence.includes(id))
  )
}

export function sameConclusion(a: Theory, b: Theory): boolean {
  return a.suspect === b.suspect && a.method === b.method && a.motive === b.motive
}
