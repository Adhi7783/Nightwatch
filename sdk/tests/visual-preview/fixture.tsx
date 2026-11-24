// Isolated visual fixture: no DeepSpace client, identity, game API or persistent writes.
import { useState } from 'react'
import { BoardFixture } from './BoardFixture'
import { createRoot } from 'react-dom/client'
import { Briefing, Machinery, type Speech } from '../../src/game/CommandVisuals'
import { BriefingAudio } from '../../src/game/BriefingAudio'
import { Hologram } from '../../src/game/Hologram'
import { Wordmark, PhaseMenu } from '../../src/game/CommandNavigation'

async function load() {
  const r = await fetch('/briefing-fixture.json')
  if (!r.ok) throw Error('The local narration fixture is missing.')
  return r.json() as Promise<Speech>
}
function Fixture() {
  const [mode, setMode] = useState(new URL(location.href).searchParams.get('scene') || 'briefing')
  const [menu, setMenu] = useState(false)
  if (mode === 'board') return <BoardFixture />
  if (mode === 'briefing') return <Briefing load={load} complete={async () => setMode('case')} />
  return <><Machinery /><header className="command-header"><span className="header-system">LOCAL VISUAL FIXTURE</span><Wordmark onClick={() => setMenu(true)} expanded={menu} /></header>
    {menu && <PhaseMenu onClose={() => setMenu(false)} items={['Case overview', 'Evidence board', 'Suspect dossiers', 'Shared notebook', 'Timeline', 'Accusation & report'].map(title => ({id:title,title,detail:'LOCAL FIXTURE / NO SAVED DATA',action:() => setMode(title)}))} />}
    <main className="main"><div className="actions-row"><button className="btn ghost" onClick={() => setMode('briefing')}>Play fixture briefing</button><BriefingAudio load={load} /></div><h1>{mode === 'case' ? 'Local case control fixture' : mode}</h1><div style={{height:420,maxWidth:560,margin:'auto'}}><Hologram scene="meridian" /></div><p className="muted">This fixture changes local React state only. It cannot create or modify a production case.</p></main>
  </>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
