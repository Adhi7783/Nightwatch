import test from 'node:test'
import assert from 'node:assert/strict'
import { validateTheory, matchesSolution, sameConclusion } from '../src/game/rules.ts'
import { clues, suspects, methods, motives, answer, reveal } from '../src/server/case.ts'
const allowed = {
  suspects: suspects.map((s) => s.id),
  methods: methods.map((m) => m.id),
  motives: motives.map((m) => m.id),
  evidence: clues.map((c) => c.id),
}
const theory = {
  suspect: answer.suspect,
  method: answer.method,
  motive: answer.motive,
  evidence: answer.required,
  explanation: 'The inspection, mold, provenance report, and crate weight establish the sequence.',
}
test('one original complete case has three suspects and ten distinct evidence IDs', () => {
  assert.equal(suspects.length, 3)
  assert.equal(clues.length, 10)
  assert.equal(new Set(allowed.evidence).size, 10)
  assert.deepEqual(
    new Set(suspects.map((s) => s.role)),
    new Set(['Art restorer', 'Security contractor', 'Museum curator']),
  )
  assert.equal(reveal.timeline.length, 6)
})
test('valid supported theory is accepted and matches the deterministic answer', () =>
  assert.equal(matchesSolution(validateTheory(theory, allowed, allowed.evidence), answer), true))
test('correct culprit without all required evidence does not solve the case', () =>
  assert.equal(matchesSolution({ ...theory, evidence: answer.required.slice(1) }, answer), false))
test('incorrect suspect is never accepted as the solution', () =>
  assert.equal(matchesSolution({ ...theory, suspect: 'eli' }, answer), false))
test('unknown suspect is rejected', () =>
  assert.throws(() =>
    validateTheory({ ...theory, suspect: 'intruder' }, allowed, allowed.evidence),
  ))
test('unshared evidence is rejected even when its ID is valid', () =>
  assert.throws(() => validateTheory(theory, allowed, [])))
test('unknown evidence cannot be smuggled into an accusation', () =>
  assert.throws(() =>
    validateTheory({ ...theory, evidence: ['invented'] }, allowed, allowed.evidence),
  ))
test('duplicate evidence is rejected', () =>
  assert.throws(() =>
    validateTheory(
      { ...theory, evidence: [...answer.required, answer.required[0]] },
      allowed,
      allowed.evidence,
    ),
  ))
test('empty evidence and non-array evidence are rejected', () => {
  for (const evidence of [[], null, 'seal'])
    assert.throws(() => validateTheory({ ...theory, evidence }, allowed, allowed.evidence))
})
test('explanation limits are checked at the server boundary', () => {
  for (const explanation of ['', 42, 'a'.repeat(1001)])
    assert.throws(() => validateTheory({ ...theory, explanation }, allowed, allowed.evidence))
})
test('matching joint conclusions can use separately written explanations', () =>
  assert.equal(sameConclusion(theory, { ...theory, explanation: 'Independent reasoning.' }), true))
test('different methods do not form an agreed accusation', () =>
  assert.equal(sameConclusion(theory, { ...theory, method: 'override' }), false))
test('required evidence exists and all public clue locations are valid', () => {
  assert.ok(answer.required.every((id) => allowed.evidence.includes(id)))
  assert.ok(clues.every((c) => ['gallery', 'security', 'studio', 'loading'].includes(c.location)))
  assert.ok(!JSON.stringify({ suspects, clues, methods, motives }).includes('required'))
})
