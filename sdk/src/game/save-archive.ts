import type { Profile } from './types.ts'

/** Personal archive only. The shared case and the partner's archive are untouched. */
export function changeSave(
  profile: Profile,
  code: unknown,
  deleted: unknown,
  now = Date.now(),
): Profile {
  if (typeof code !== 'string' || !/^[A-F0-9]{12}$/.test(code) || typeof deleted !== 'boolean')
    throw Object.assign(Error('Choose a saved case and a valid archive action.'), { status: 400 })
  const removed = profile.deletedRooms || []
  if (!profile.rooms.includes(code) && !removed.some((r) => r.code === code))
    throw Object.assign(Error('This case is not in your saved archive.'), { status: 404 })
  return {
    ...profile,
    rooms: deleted
      ? profile.rooms.filter((id) => id !== code)
      : [code, ...profile.rooms.filter((id) => id !== code)].slice(0, 30),
    deletedRooms: deleted
      ? [
          ...removed.filter((r) => r.code !== code),
          { code, at: removed.find((r) => r.code === code)?.at || now },
        ].slice(-100)
      : removed.filter((r) => r.code !== code),
  }
}
