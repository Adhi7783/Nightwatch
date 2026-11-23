import type { Profile, PublicGame } from './types'

export function needsBriefing(
  profile: Pick<Profile, 'name' | 'briefedRooms'> | null,
  game: Pick<PublicGame, 'code' | 'status'> | null,
) {
  return (
    !!profile?.name &&
    !!game &&
    game.status !== 'closed' &&
    !(profile.briefedRooms || []).includes(game.code)
  )
}

/** Preserve completed briefings for existing profiles when moving off the old global flag. */
export function briefingHistory(profile: Profile) {
  return profile.briefedRooms ?? (profile.briefingSeen ? [...profile.rooms] : [])
}
