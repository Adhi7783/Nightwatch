import test from 'node:test'
import assert from 'node:assert/strict'
import { makeScene, torus, pose, perspective, multiply } from '../src/game/hologram-geometry.ts'

test('holograms contain finite three-dimensional line geometry for both scenes', () => {
  for (const scene of ['meridian', 'machinery'] as const) {
    const parts = makeScene(scene)
    assert.ok(parts.length >= 10)
    assert.ok(
      parts.every(
        (p) =>
          p.vertices.length > 0 && p.vertices.length % 6 === 0 && p.vertices.every(Number.isFinite),
      ),
    )
    assert.ok(parts.some((p) => p.rotation[0] !== 0 || p.rotation[1] !== 0))
  }
  const ring = torus(1.5)
  assert.ok(
    ring.some((value, i) => i % 3 === 2 && Math.abs(value) > 0.01),
    'The ring has depth, not a flat ellipse',
  )
})
test('three-dimensional rotation preserves length and rotates through depth', () => {
  const rotated = pose([0, 0, 0], [0, Math.PI / 2, 0])
  assert.ok(Math.abs(rotated[0]) < 0.00001)
  assert.ok(Math.abs(rotated[2] + 1) < 0.00001)
  assert.ok(Math.abs(Math.hypot(rotated[0], rotated[1], rotated[2]) - 1) < 0.00001)
})
test('perspective gives nearer geometry a larger projected size', () => {
  const camera = perspective(1, 6)
  const near = multiply(camera, pose([1, 0, 1], [0, 0, 0]))
  const far = multiply(camera, pose([1, 0, -1], [0, 0, 0]))
  assert.ok(near[12] / near[15] > far[12] / far[15])
})
