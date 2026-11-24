import type { BoardPosition, Dossier, Evidence } from './types.ts'

export const BOARD = { width: 1680, height: 1120, cardWidth: 246, cardHeight: 154 }
export function boundPosition(x: number, y: number) {
  return {
    x: Math.round(Math.max(16, Math.min(BOARD.width - BOARD.cardWidth - 16, x))),
    y: Math.round(Math.max(58, Math.min(BOARD.height - BOARD.cardHeight - 16, y))),
  }
}
/** Stable inbox slots: discovering another clue never shifts an existing card. */
export function initialPosition(
  id: string,
  shared: Evidence[],
  suspects: Dossier['suspects'],
): BoardPosition {
  const suspect = suspects.findIndex((s) => 'suspect:' + s.id === id)
  const i = suspect >= 0 ? suspect : shared.findIndex((c) => c.id === id)
  return {
    x: suspect >= 0 ? 1390 : 28 + (Math.max(i, 0) % 5) * 268,
    y: suspect >= 0 ? 92 + i * 268 : 110 + Math.floor(Math.max(i, 0) / 5) * 240,
    revision: 0,
  }
}
export function tidyPositions(
  shared: Evidence[],
  suspects: Dossier['suspects'],
  locations: Dossier['locations'],
) {
  const result: Record<string, { x: number; y: number }> = {}
  locations.forEach((l, column) =>
    shared
      .filter((c) => c.location === l.id)
      .forEach((c, row) => {
        result[c.id] = { x: 30 + column * 310, y: 110 + row * 234 }
      }),
  )
  suspects.forEach((s, i) => {
    result['suspect:' + s.id] = { x: 1390, y: 92 + i * 268 }
  })
  return result
}
export function connectionPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const ax = a.x + BOARD.cardWidth / 2,
    ay = a.y + BOARD.cardHeight / 2
  const bx = b.x + BOARD.cardWidth / 2,
    by = b.y + BOARD.cardHeight / 2
  const dx = bx - ax,
    dy = by - ay
  const edge = (x: number, y: number, vx: number, vy: number) => {
    const scale = Math.min(
      BOARD.cardWidth / 2 / Math.max(Math.abs(vx), 0.001),
      BOARD.cardHeight / 2 / Math.max(Math.abs(vy), 0.001),
    )
    return { x: x + vx * scale, y: y + vy * scale }
  }
  const start = edge(ax, ay, dx, dy),
    end = edge(bx, by, -dx, -dy)
  return { d: `M ${start.x} ${start.y} L ${end.x} ${end.y}`, x: (ax + bx) / 2, y: (ay + by) / 2 }
}
