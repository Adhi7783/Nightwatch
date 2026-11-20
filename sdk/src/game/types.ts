export type Phase = 'waiting' | 'investigating' | 'closed'
export type Member = { id: string; name: string; role: number; seen: number }
export type Evidence = {
  id: string
  location: string
  role: number
  title: string
  kind: string
  time: string
  body: string
  inference: string
}
export type Profile = {
  id: string
  name: string
  rooms: string[]
  closed: string[]
  created: number
}
export type Theory = {
  suspect: string
  method: string
  motive: string
  evidence: string[]
  explanation: string
}
export type Link = { id: string; source: string; target: string; by: string; at: number }
export type Event = { text: string; at: number; by?: string; kind?: string }
export type Resolution = {
  proof: { id: string; reason: string }[]
  title: string
  culprit: string
  summary: string
  method: string
  motive: string
  recovery: string
  timeline: string[][]
  exonerated: string
}
export type Game = {
  code: string
  caseId: string
  title: string
  hostId: string
  status: Phase
  created: number
  members: Member[]
  shared: string[]
  reviewed: Record<string, string[]>
  pinned: string[]
  links: Link[]
  notes: { id: string; by: string; text: string; at: number }[]
  votes: Record<string, Theory | { reveal: true }>
  attempts: number
  lastAttempt: number
  events: Event[]
  feedback?: string
  outcome?: string
  closedAt?: number
  submissions: { by: string; at: number; theory: Theory; result: string }[]
  receipts: Record<string, string>
  contributions?: Record<string, { evidence: number; notes: number; links: number }>
}
export type PublicGame = Omit<Game, 'shared' | 'receipts'> & {
  shared: Evidence[]
  reveal?: Resolution
}
export type Dossier = {
  role: number
  locations: { id: string; name: string; type: string; description: string; icon: string }[]
  suspects: {
    id: string
    name: string
    role: string
    initials: string
    color: string
    statement: string
    detail: string
    motive: string
    opportunity: string
    alibi: string
  }[]
  methods: { id: string; label: string }[]
  motives: { id: string; label: string }[]
  brief: string
}
