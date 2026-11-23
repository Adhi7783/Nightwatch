export type Vec3 = [number, number, number]
export type WirePart = {
  vertices: Float32Array
  position: Vec3
  rotation: Vec3
  spin: number
  scale: number
  alpha: number
}
export type HologramScene = 'meridian' | 'machinery'
const TAU = Math.PI * 2
const line = (out: number[], a: Vec3, b: Vec3) => out.push(...a, ...b)

export function torus(radius: number, tube = 0.025, segments = 80, sides = 5) {
  const out: number[] = []
  const point = (u: number, v: number): Vec3 => [
    (radius + tube * Math.cos(v)) * Math.cos(u),
    (radius + tube * Math.cos(v)) * Math.sin(u),
    tube * Math.sin(v),
  ]
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < sides; j++) {
      const u = (i * TAU) / segments,
        v = (j * TAU) / sides
      line(out, point(u, v), point(((i + 1) * TAU) / segments, v))
      if (i % 4 === 0) line(out, point(u, v), point(u, ((j + 1) * TAU) / sides))
    }
  return new Float32Array(out)
}
function ticks(radius: number) {
  const out: number[] = []
  for (let i = 0; i < 48; i++) {
    const a = (i * TAU) / 48,
      r = radius + (i % 4 === 0 ? 0.15 : 0.07)
    line(
      out,
      [radius * Math.cos(a), radius * Math.sin(a), 0],
      [r * Math.cos(a), r * Math.sin(a), 0],
    )
  }
  return new Float32Array(out)
}
function impeller(radius: number, blades: number) {
  const out: number[] = []
  const point = (r: number, a: number, z: number): Vec3 => [r * Math.cos(a), r * Math.sin(a), z]
  for (let i = 0; i < blades; i++) {
    const a = (i * TAU) / blades
    const face = [
      point(radius * 0.29, a, -0.04),
      point(radius * 0.94, a + 0.12, -0.09),
      point(radius, a + 0.22, 0.09),
      point(radius * 0.4, a + 0.2, 0.04),
    ]
    for (let j = 0; j < 4; j++) {
      line(out, face[j], face[(j + 1) % 4])
      const b: Vec3 = [face[j][0], face[j][1], face[j][2] + 0.045]
      line(out, face[j], b)
    }
  }
  return new Float32Array(out)
}
function shaft(length: number, radius: number) {
  const out: number[] = []
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12
    line(
      out,
      [-length / 2, radius * Math.sin(a), radius * Math.cos(a)],
      [length / 2, radius * Math.sin(a), radius * Math.cos(a)],
    )
  }
  return new Float32Array(out)
}
const part = (
  vertices: Float32Array,
  position: Vec3 = [0, 0, 0],
  rotation: Vec3 = [0, 0, 0],
  spin = 0,
  scale = 1,
  alpha = 0.6,
): WirePart => ({ vertices, position, rotation, spin, scale, alpha })

export function makeScene(scene: HologramScene): WirePart[] {
  if (scene === 'meridian') {
    const stand: number[] = []
    line(stand, [0, -1.75, 0], [0, 1.72, 0])
    const feet: Vec3[] = [
      [-0.68, -2.1, 0.4],
      [0.68, -2.1, 0.4],
      [0, -2.1, -0.68],
    ]
    for (let i = 0; i < 3; i++) {
      line(stand, [0, -1.59, 0], feet[i])
      line(stand, feet[i], feet[(i + 1) % 3])
    }
    return [
      part(torus(1.53, 0.036)),
      part(ticks(1.56), [0, 0, 0], [0, 0, 0], 0, 1, 0.72),
      part(torus(1.45, 0.027), [0, 0, 0], [0.13, 1.08, 0.3]),
      part(torus(1.57, 0.025), [0, 0, 0], [1.15, 0.2, -0.45]),
      part(torus(1.36, 0.018), [0, 0, 0], [Math.PI / 2, 0, 0], 0, 1, 0.48),
      part(torus(0.24, 0.009), [0, 0, 0], [0.3, 0.2, 0], 0, 1, 0.95),
      part(torus(0.24, 0.009), [0, 0, 0], [1.2, 0.8, 0.6], 0, 1, 0.9),
      part(torus(0.058, 0.012, 24, 4), [0, 0, 0], [0, 0, 0], 0, 1, 1),
      part(new Float32Array(stand), [0, 0, 0], [0, 0, 0], 0, 1, 0.55),
      part(torus(0.12, 0.018, 32, 4), [0, -1.67, 0], [Math.PI / 2, 0, 0]),
    ]
  }
  const parts: WirePart[] = [part(shaft(7.4, 0.13), [0, 0, 0], [0, 0, 0], 0, 1, 0.25)]
  const radii = [1.62, 1.37, 1.18, 1.07, 0.85, 0.68]
  radii.forEach((r, i) => {
    const x = -3.25 + i * 1.25,
      orientation: Vec3 = [0, Math.PI / 2, 0]
    parts.push(part(torus(r, 0.045, 64, 4), [x, 0, 0], orientation, 0.17 + i * 0.02, 1, 0.28))
    parts.push(
      part(torus(r * 0.77, 0.018, 64, 3), [x, 0, 0], orientation, -0.14 - i * 0.02, 1, 0.34),
    )
    parts.push(
      part(impeller(r, 22 + i * 2), [x + 0.12, 0, 0], orientation, i % 2 ? -0.23 : 0.2, 1, 0.26),
    )
    parts.push(part(torus(r * 0.25, 0.035, 36, 4), [x + 0.2, 0, 0], orientation, 0.2, 1, 0.42))
  })
  // Two smaller calibration assemblies add depth without extra dashboard copy.
  parts.push(part(torus(1.1, 0.025), [-3, -2.5, 0.5], [0.5, -0.4, 0], -0.12, 1, 0.28))
  parts.push(part(ticks(1.14), [-3, -2.5, 0.5], [0.5, -0.4, 0], -0.12, 1, 0.22))
  parts.push(part(impeller(0.82, 24), [-3, -2.5, 0.5], [0.5, -0.4, 0], 0.35, 1, 0.26))
  parts.push(part(torus(0.8, 0.025), [3.2, 2.25, -0.4], [0.6, 0.4, 0], 0.15, 1, 0.25))
  parts.push(part(impeller(0.7, 18), [3.2, 2.25, -0.4], [0.6, 0.4, 0], -0.3, 1, 0.22))
  return parts
}

export function multiply(a: Float32Array, b: Float32Array) {
  const out = new Float32Array(16)
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++)
      out[col * 4 + row] =
        a[row] * b[col * 4] +
        a[4 + row] * b[col * 4 + 1] +
        a[8 + row] * b[col * 4 + 2] +
        a[12 + row] * b[col * 4 + 3]
  return out
}
export function pose(position: Vec3, rotation: Vec3, scale = 1) {
  const [x, y, z] = rotation,
    cx = Math.cos(x),
    sx = Math.sin(x),
    cy = Math.cos(y),
    sy = Math.sin(y),
    cz = Math.cos(z),
    sz = Math.sin(z)
  const rx = new Float32Array([1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1])
  const ry = new Float32Array([cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1])
  const rz = new Float32Array([cz, sz, 0, 0, -sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
  const out = multiply(multiply(rx, ry), rz)
  for (let i = 0; i < 12; i++) out[i] *= scale
  out[12] = position[0]
  out[13] = position[1]
  out[14] = position[2]
  return out
}
export function perspective(aspect: number, distance: number) {
  const f = 1 / Math.tan(0.4),
    near = 0.1,
    far = 50
  const projection = new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) / (near - far),
    -1,
    0,
    0,
    (2 * far * near) / (near - far),
    0,
  ])
  return multiply(projection, pose([0, 0, -distance], [0, 0, 0]))
}
