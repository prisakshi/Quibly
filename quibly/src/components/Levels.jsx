import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const COL = ['#ff6f91', '#ffa24c', '#f2c230', '#5cc98a', '#4db8e8', '#9b7cf2']
const EMO = ['🍓', '🍋', '🍇', '🥝', '🍑', '🫐', '🍉', '🥥']
const LV = [
  { t: 'q', n: 'Warm-up', p: 'Who is most likely to oversleep tomorrow?' },
  { t: 'mem', n: 'Emoji echo', len: 3 },
  { t: 'joke', n: 'Inside joke', p: 'Write a tiny inside joke or nickname only this group would get.' },
  { t: 'team', n: 'Team huddle', tasks: ['Everyone drinks some water', 'Send one kind message in chat', 'Share a silly face (or describe it)'] },
  { t: 'q', n: 'Hot take', p: 'Who would survive longest on a desert island?' },
  { t: 'mem', n: 'Echo, harder', len: 4 },
  { t: 'joke', n: 'Memory lane', p: 'Describe a favorite memory together in one sentence.' },
  { t: 'team', n: 'Stretch break', tasks: ['Stand up and stretch', 'Name one thing you are grateful for', 'High-five (virtual counts)'] },
  { t: 'q', n: 'Snack court', p: 'Who picks the best snacks?' },
  { t: 'mem', n: 'Echo, pro', len: 5 },
  { t: 'joke', n: 'Group motto', p: 'Invent a motto for this room.' },
  { t: 'team', n: 'Grand finale', tasks: ['Everyone shares one thing they are proud of', 'Pick the next group plan', 'Cheer together!'] },
]

function Pick({ p, names, onPass }) {
  const [v, setV] = useState('')
  return (
    <>
      <p>{p}</p>
      <div className="chips">
        {names.map(n => (
          <button key={n} className={'chip ' + (v === n ? 'on' : '')} onClick={() => setV(n)}>{n}</button>
        ))}
      </div>
      <button disabled={!v} onClick={onPass}>Lock in answer</button>
    </>
  )
}

function Joke({ p, onPass }) {
  const [t, setT] = useState('')
  return (
    <>
      <p>{p}</p>
      <textarea rows="2" value={t} onChange={e => setT(e.target.value)} placeholder="Type it here…" />
      <button disabled={t.trim().length < 3} onClick={onPass}>Done</button>
    </>
  )
}

function Team({ tasks, onPass }) {
  const [ok, setOk] = useState({})
  return (
    <>
      {tasks.map((t, i) => (
        <label key={i} className="check">
          <input type="checkbox" checked={!!ok[i]} onChange={e => setOk({ ...ok, [i]: e.target.checked })} /> {t}
        </label>
      ))}
      <button disabled={!tasks.every((_, i) => ok[i])} onClick={onPass}>We did it!</button>
    </>
  )
}

function Memory({ len, onPass }) {
  const [seq] = useState(() => Array.from({ length: len }, () => Math.floor(Math.random() * 8)))
  const [hide, setHide] = useState(false)
  const [n, setN] = useState(0)
  const [msg, setMsg] = useState('Watch the order, then tap it back together.')
  function tap(i) {
    if (!hide) return
    if (seq[n] !== i) { setN(0); setHide(false); setMsg('Not quite! Peek again and retry.'); return }
    if (n + 1 === len) onPass(); else setN(n + 1)
  }
  return (
    <>
      <p className="muted">{msg}</p>
      <div className="seq">{hide ? '❓'.repeat(len) : seq.map(s => EMO[s]).join(' ')}</div>
      {!hide && <button className="alt" onClick={() => { setHide(true); setMsg('Tap the fruits in order') }}>Hide and play</button>}
      <div className="memgrid">
        {EMO.map((e, i) => <button key={i} onClick={() => tap(i)}>{e}</button>)}
      </div>
      <p className="muted">Tapped {n} of {len}</p>
    </>
  )
}

export default function Levels({ roomId, onChange }) {
  const [cleared, setCleared] = useState(0)
  const [open, setOpen] = useState(null)
  const [names, setNames] = useState([])
  const [note, setNote] = useState('')

  async function load() {
    const l = await supabase.from('levels_passed').select('level').eq('room_id', roomId)
    const rows = l.data || []
    setCleared(rows.length ? Math.max(...rows.map(x => x.level)) : 0)
    const m = await supabase.from('room_members').select('user_id').eq('room_id', roomId)
    const ids = (m.data || []).map(x => x.user_id)
    const p = await supabase.from('profiles').select('id,display_name').in('id', ids)
    setNames((p.data || []).map(x => x.display_name))
  }
  useEffect(() => { load() }, [roomId])

  async function pass(i) {
    const { data, error } = await supabase.rpc('pass_level', { p_room: roomId, p_level: i + 1 })
    if (error) return setNote(error.message)
    setNote(data ? '🎉 Level ' + (i + 1) + ' cleared! +10 room coins' : 'Replay complete. Nice!')
    setOpen(null)
    await load()
    if (onChange) onChange()
  }

  const lv = open !== null ? LV[open] : null
  const done = () => pass(open)

  return (
    <div className="card">
      <h3>🗺️ Level trail</h3>
      <p className="muted">Pass a level together to unlock the next. First wins add 10 room coins.</p>
      {note && <p><b>{note}</b></p>}
      <div className="trail">
        {LV.map((l, i) => {
          const locked = i > cleared
          return (
            <button key={i} disabled={locked} title={l.n}
                    className={'lv ' + (i < cleared ? 'done' : '') + (i === cleared ? ' cur' : '')}
                    style={{ background: locked ? '#9a909a' : COL[i % 6],
                             transform: 'translateX(' + Math.round(Math.sin(i * 1.1) * 60) + 'px)' }}
                    onClick={() => { setNote(''); setOpen(i) }}>
              {locked ? '🔒' : i + 1}
            </button>
          )
        })}
      </div>
      {cleared >= LV.length && <p><b>🏆 You cleared every level!</b></p>}

      {lv && (
        <div className="sheet">
          <div className="card">
            <div className="top">
              <h3>Level {open + 1}: {lv.n}</h3>
              <button className="alt" onClick={() => setOpen(null)}>✕</button>
            </div>
            {lv.t === 'q' && <Pick p={lv.p} names={names} onPass={done} />}
            {lv.t === 'joke' && <Joke p={lv.p} onPass={done} />}
            {lv.t === 'team' && <Team tasks={lv.tasks} onPass={done} />}
            {lv.t === 'mem' && <Memory len={lv.len} onPass={done} />}
          </div>
        </div>
      )}
    </div>
  )
}
