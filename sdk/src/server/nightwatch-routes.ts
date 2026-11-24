import type { Hono } from 'hono'
import { authenticatedRoomRequest, verifyJwt, verifyAgentToken } from 'deepspace/worker'
import type { AppContext, Env } from '../../worker'
import type { Profile, PublicGame } from '../game/types'
import { feature } from './case-services'

function internal(stub: DurableObjectStub, action: string, body: unknown) {
  return stub.fetch(
    new Request('https://internal/nightwatch/' + action, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  )
}
export function registerNightwatchRoutes(app: Hono<AppContext>) {
  app.all('/api/nightwatch/:action', async (c) => {
    const req = c.req.raw,
      url = new URL(req.url),
      action = c.req.param('action')
    if (!['GET', 'POST'].includes(req.method)) return c.json({ error: 'Method not allowed' }, 405)
    if (req.headers.get('Origin') && req.headers.get('Origin') !== url.origin)
      return c.json({ error: 'Cross-origin requests refused' }, 403)
    const token =
      req.headers.get('Authorization')?.replace(/^Bearer /, '') ||
      (action === 'live' ? url.searchParams.get('token') : null)
    if (!token) return c.json({ error: 'Sign in to DeepSpace first.' }, 401)
    const verifier = { publicKey: c.env.AUTH_JWT_PUBLIC_KEY, issuer: c.env.AUTH_JWT_ISSUER }
    const auth =
      (await verifyJwt(verifier, token)).result ||
      (await verifyAgentToken(verifier, token, url.origin)).result
    if (!auth) return c.json({ error: 'Your session expired. Sign in again.' }, 401)
    const global = c.env.BOARD.get(c.env.BOARD.idFromName('nightwatch:v2:profiles'))
    let body: Record<string, unknown> = {}
    if (req.method === 'POST') {
      if (!req.headers.get('Content-Type')?.includes('application/json'))
        return c.json({ error: 'JSON required' }, 415)
      const text = await req.text()
      if (text.length > 4096) return c.json({ error: 'Request too large' }, 413)
      try {
        body = JSON.parse(text)
      } catch {
        return c.json({ error: 'Invalid JSON' }, 400)
      }
      if (!body || typeof body !== 'object' || Array.isArray(body))
        return c.json({ error: 'An object is required' }, 400)
    }
    const who = { id: auth.userId, name: '' } as Profile
    const p = await internal(global, 'profile', {
      who,
      ...(action === 'profile' && req.method === 'POST' ? { name: body.name } : {}),
    })
    if (!p.ok) return p
    const { profile } = (await p.json()) as { profile: Profile }
    if (action === 'profile') return c.json({ profile })
    if (!profile.name) return c.json({ error: 'Choose a detective name first.' }, 409)
    if (action === 'briefing' && req.method === 'POST')
      return feature(c.env, global, profile, 'briefing')
    if (action === 'create' && req.method === 'POST') {
      const code = crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()
      const room = c.env.BOARD.get(c.env.BOARD.idFromName('nightwatch:v2:room:' + code))
      const r = await internal(room, 'create', { code, who: profile })
      if (r.ok) await internal(global, 'profile', { who: profile, room: code })
      return r
    }
    const code = String(body.code || url.searchParams.get('code') || '')
      .replace(/[-–\s]/g, '')
      .toUpperCase()
    if (!/^[A-F0-9]{12}$/.test(code))
      return c.json({ error: 'Use the 12-character invitation code.' }, 400)
    if (action === 'archive' && req.method === 'POST')
      return internal(global, 'archive', { who: profile, code, deleted: body.deleted })
    const room = c.env.BOARD.get(c.env.BOARD.idFromName('nightwatch:v2:room:' + code))
    if (action === 'briefing-seen' && req.method === 'POST') {
      const gate = await internal(room, 'room', { who: profile })
      if (!gate.ok) return gate
      return internal(global, 'profile', { who: profile, briefedRoom: code })
    }
    if (['recap', 'report'].includes(action) && req.method === 'POST') {
      const gate = await internal(room, 'room', { who: profile })
      if (!gate.ok) return gate
      return feature(
        c.env,
        global,
        profile,
        action as 'recap' | 'report',
        (await gate.json()) as PublicGame,
      )
    }
    const reads = ['room', 'dossier', 'inspect', 'live'],
      writes = [
        'join',
        'start',
        'share',
        'review',
        'pin',
        'link',
        'unlink',
        'update-link',
        'board-claim',
        'board-release',
        'board-layout',
        'board-undo',
        'note',
        'accuse',
        'reveal',
        'heartbeat',
      ]
    if (!(req.method === 'GET' ? reads : writes).includes(action))
      return c.json({ error: 'Unknown operation' }, 404)
    if (action === 'live') {
      if (req.headers.get('Origin') !== url.origin)
        return c.json({ error: 'Cross-origin WebSocket refused' }, 403)
      const gate = await internal(room, 'socket', { who: profile })
      if (!gate.ok) return gate
      url.pathname = '/ws/nightwatch:' + code
      url.search = ''
      return room.fetch(authenticatedRoomRequest(new Request(url, req), auth))
    }
    const r = await internal(room, action, {
      ...body,
      location: url.searchParams.get('location') || body.location,
      who: profile,
    })
    if (r.ok && action === 'join') await internal(global, 'profile', { who: profile, room: code })
    if (r.ok && ['room', 'accuse', 'reveal'].includes(action)) {
      const game = (await r.json()) as PublicGame
      if (game.status === 'closed') await internal(global, 'profile', { who: profile, award: code })
      return c.json(game)
    }
    return r
  })
}
