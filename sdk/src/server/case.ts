export const suspects = [
  {
    id: 'mara',
    name: 'Mara Voss',
    role: 'Art restorer',
    initials: 'MV',
    color: '#709caa',
    statement:
      '“I stayed in conservation after the gala toast. I certified the Meridian five years ago; I know exactly how fragile it is.”',
    detail:
      'Contracted to restore the instrument and assess its provenance. Her signed certification is due for an external audit.',
  },
  {
    id: 'eli',
    name: 'Eli Ward',
    role: 'Security contractor',
    initials: 'EW',
    color: '#78949d',
    statement:
      '“I restarted camera seven at 22:09. A routine fault. The independent desk camera can show you where I was.”',
    detail:
      'An outside security specialist responsible for cameras, alarm monitoring, and the gala access plan.',
  },
  {
    id: 'julian',
    name: 'Julian Vale',
    role: 'Museum curator',
    initials: 'JV',
    color: '#b59673',
    statement:
      '“I moved sealed cradle R-19 at 22:14 on Mara’s written instruction. I thought it was empty. I never opened it.”',
    detail:
      'The curator faces a shrinking acquisitions budget. He authorized a morning transfer to offsite storage, but has no conservation display key.',
  },
]
export const locations = [
  {
    id: 'gallery',
    name: 'The Meridian Gallery',
    type: 'CRIME SCENE',
    description: 'An empty plinth. An intact lock. Something about this theft is too clean.',
    icon: '◈',
  },
  {
    id: 'security',
    name: 'Security Office',
    type: 'ACCESS & SURVEILLANCE',
    description: 'Ninety missing seconds, and a system that remembers more than its operators.',
    icon: '▣',
  },
  {
    id: 'studio',
    name: 'Conservation Studio',
    type: 'FORENSIC EVIDENCE',
    description: 'Behind the exhibition, where originals and replicas look almost the same.',
    icon: '◇',
  },
  {
    id: 'loading',
    name: 'Service Corridor',
    type: 'MOVEMENT & MOTIVE',
    description: 'The last route out of the museum was never meant for guests.',
    icon: '▤',
  },
]
// Hand-authored case content. This module is Worker-only and is never served as an asset.
export const clues = [
  {
    id: 'seal',
    location: 'gallery',
    role: 0,
    title: 'The unbroken seal',
    kind: 'SCENE REPORT',
    time: '22:20',
    body: 'The display’s numbered security seal is intact. Its weekly opening was logged at 17:40, supervised by Mara Voss. A sharp photograph from the 21:30 gala toast shows a tiny crescent scratch on the Meridian’s lower ring. The authentic object’s condition report records no such scratch.',
    inference: 'The object seen during the gala may already have been a substitute.',
  },
  {
    id: 'dust',
    location: 'gallery',
    role: 1,
    title: 'Blue in the velvet',
    kind: 'FORENSIC REPORT',
    time: '22:24',
    body: 'Blue silicone residue is caught beneath the display’s velvet support. The conservation studio uses blue two-part silicone to cast exhibition replicas. Neither the display-case mechanism nor the original Meridian contains silicone.',
    inference: 'A replica was in contact with the display support.',
  },
  {
    id: 'camera',
    location: 'security',
    role: 0,
    title: 'Ninety seconds of darkness',
    kind: 'CAMERA LOG',
    time: '22:09',
    body: 'Camera seven was offline from 22:09:00 to 22:10:30. Its field of view covers the loading door, not the gallery. A battery-backed desk camera shows Eli Ward seated at his console throughout. At 22:10:42, the loading camera records Mara carrying a red conservation crate toward the studio.',
    inference: 'The outage is real, but it does not hide a theft from the gallery.',
  },
  {
    id: 'access',
    location: 'security',
    role: 1,
    title: 'An authorized opening',
    kind: 'ACCESS LOG',
    time: '17:40',
    body: 'The display was opened at 17:40 with conservation key CV-02, assigned to Mara Voss. No display opening occurred afterward. Eli’s override card was not used. At 22:17 the load sensor changed from 840 g to 0 g without the lock opening; the alarm followed. A timed lifting cradle can be operated from beneath the plinth.',
    inference: 'The alarm marks the decoy’s removal, not necessarily the original’s theft.',
  },
  {
    id: 'mold',
    location: 'studio',
    role: 0,
    title: 'A familiar imperfection',
    kind: 'BENCH EXAMINATION',
    time: '22:31',
    body: 'A fresh silicone mold matches the Meridian. A crescent-shaped nick in its lower ring matches the gala photograph exactly. A small timed lifting cradle is missing from the studio’s equipment rack. Mara’s 17:40 checklist says “humidity inspection”; replicas are not authorized for that procedure.',
    inference: 'The substitute and its removal mechanism came from conservation.',
  },
  {
    id: 'ledger',
    location: 'studio',
    role: 1,
    title: 'The missing provenance page',
    kind: 'DOCUMENT RECOVERY',
    time: '22:34',
    body: 'A page recovered from Mara’s shred bin is a signed 2021 provenance assessment. It identifies the Meridian as a later reproduction. A note from the museum’s director reads: “External audit opens Monday. Your certification will be reviewed first.” The reverse has a handwritten inventory code: R-19.',
    inference: 'An audit threatens the reputation of the person who certified the object.',
  },
  {
    id: 'order',
    location: 'loading',
    role: 0,
    title: 'Cradle R-19',
    kind: 'SHIPPING RECORD',
    time: '22:14',
    body: 'Julian’s signed work order instructs him to move sealed conservation cradle R-19 from the studio to bonded storage. Mara signed it at 21:55. The independent bay scale recorded 6.84 kg. Its tare label reads 6.00 kg. Julian’s corridor footage shows him moving the sealed cradle without opening it.',
    inference: 'The “empty” cradle contained an extra 840 g: the Meridian’s recorded weight.',
  },
  {
    id: 'receipt',
    location: 'loading',
    role: 1,
    title: 'Before the morning collection',
    kind: 'RECEIVING SLIP',
    time: '22:38',
    body: 'Cradle R-19 is still in the museum’s locked bonded-storage cage. Collection is scheduled for 06:00. Its transfer instruction was added by Mara at 21:55. The red crate seen with her at 22:10 was logged empty on return.',
    inference: 'The missing instrument may still be inside the museum.',
  },
  {
    id: 'timer',
    location: 'studio',
    role: 0,
    title: 'The delayed trigger',
    kind: 'EQUIPMENT MANUAL',
    time: '22:40',
    body: 'The missing lifting cradle fits beneath the gallery plinth and supports a programmed release. Its bench-test log records an 840 g replica load and a 22:17 release, saved during the 17:40 inspection. Mara signed the equipment checkout.',
    inference: 'A delayed mechanism could create an alarm long after the original was removed.',
  },
  {
    id: 'message',
    location: 'security',
    role: 1,
    title: 'An unwelcome audit',
    kind: 'DIRECTOR’S MEMO',
    time: '22:42',
    body: 'The curator requested an external audit after noticing gaps in the Meridian’s provenance. An independent copy of the director’s memo names Mara as the signer of the disputed certification. Julian’s signed request predates the gala by a week.',
    inference:
      'The curator initiated the audit; the restorer’s certification is the document under scrutiny.',
  },
]
export const methods = [
  { id: 'swap', label: 'A replica swap before the gala' },
  { id: 'override', label: 'A security override during the blackout' },
  { id: 'case', label: 'The display was forced during the gala' },
]
export const motives = [
  { id: 'audit', label: 'Conceal a fraudulent certification' },
  { id: 'debt', label: 'Settle a private gambling debt' },
  { id: 'family', label: 'Reclaim a disputed family gift' },
]
export const reveal = {
  title: 'The theft happened before the lights went out.',
  culprit: 'Mara Voss',
  summary:
    'Mara replaced the Meridian with a silicone-cast replica during her authorized 17:40 inspection. The crescent flaw in her mold appears on the gala photograph, while the unbroken seal and access log rule out a later opening.',
  method:
    'A timed cradle removed the replica from beneath the plinth at 22:17, turning an earlier swap into an apparent late-night heist. Eli’s camera restart was a useful distraction, not the means of entry. Julian unknowingly moved the original inside sealed cradle R-19.',
  motive:
    'The external audit would expose Mara’s signed, false provenance certification. Staging a theft would take the object out of circulation before it could be examined. She intended to retrieve it after the investigation moved elsewhere.',
  recovery:
    'Cradle R-19 is secured in the museum’s bonded-storage cage. Its 840 g excess weight accounts for the missing Meridian. Investigators recover it before the 06:00 collection.',
  timeline: [
    ['17:40', 'Mara opens the case and substitutes her replica.'],
    ['21:30', 'The replica’s crescent flaw is captured in a gala photograph.'],
    ['21:55', 'Mara signs the misleading transfer order for R-19.'],
    ['22:09', 'Eli restarts camera seven; his desk camera confirms his location.'],
    ['22:14', 'Julian moves the sealed cradle containing the original.'],
    ['22:17', 'The timed cradle removes the replica; the load alarm sounds.'],
  ],
  exonerated:
    'Eli’s independent desk footage corroborates his alibi. Julian moved a sealed crate under Mara’s signed order and had himself requested the audit. His belief that the crate was empty was mistaken, but the footage and paperwork account for his actions.',
}

export const answer = {
  suspect: 'mara',
  method: 'swap',
  motive: 'audit',
  required: ['seal', 'mold', 'order', 'ledger'],
}
