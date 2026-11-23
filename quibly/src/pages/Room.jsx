import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Chat from '../components/QuiblyChat.jsx'
import Levels from '../components/Levels.jsx'

const today = () => new Date().toLocaleDateString('en-CA')

export default function Room() {
  const { id } = useParams()
  const [room, setRoom] = useState(null)
  const [acts, setActs] = useState([])
  const [feed, setFeed] = useState([])
  const [streak, setStreak] = useState(0)
  const [coins, setCoins] = useState({ personal: 0, room: 0 })
  const [sel, setSel] = useState('')
  const [priv, setPriv] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const r = await supabase.from('rooms').select('id,name,code,min_members').eq('id', id).single()
    if (r.error) return setError('Room: ' + r.error.message)
    setRoom(r.data)

    const a = await supabase.from('activities').select('id,emoji,label,counts').eq('room_id', id)
    if (a.error) return setError('Activities: ' + a.error.message)
    setActs(a.data)
    setSel(s => s || (a.data[0] && a.data[0].id) || '')

    const s = await supabase.rpc('room_streak', { p_room: id })
    if (s.error) return setError('Streak: ' + s.error.message)
    setStreak(s.data)

    const c = await supabase.from('coin_tx').select('kind,amount').eq('room_id', id)
    if (c.error) return setError('Coins: ' + c.error.message)
    const sum = k => c.data.filter(t => t.kind === k).reduce((n, t) => n + t.amount, 0)
    setCoins({ personal: sum('personal'), room: sum('room') })

    const f = await supabase.from('checkin_feed').select('*').eq('room_id', id)
      .order('created_at', { ascending: false }).limit(20)
    if (f.error) return setError('Feed: ' + f.error.message)
    setFeed(f.data)
  }, [id])

  useEffect(() => { load() }, [load])

  async function checkIn() {
    setMsg('')
    const { error } = await supabase.rpc('do_checkin', {
      p_room: id, p_act: sel, p_private: priv, p_day: today(),
    })
    if (error) return setMsg(error.message)
    setMsg('Checked in. Thanks for sharing a little win!')
    load()
  }

  if (error) return <div className="page"><Link to="/">← Back</Link><p className="error">{error}</p></div>
  if (!room) return <div className="page"><p>Loading…</p></div>

  return (
    <div className="page">
      <Link to="/">← Back</Link>
      <h2>{room.name}</h2>
      <p className="muted">Room code {room.code}</p>

      <div className="stats">
        <div className="stat"><b>🔥 {streak}</b><span className="muted">group streak</span></div>
        <div className="stat"><b>🪙 {coins.personal}</b><span className="muted">my coins</span></div>
        <div className="stat"><b>🍯 {coins.room}</b><span className="muted">room jar</span></div>
      </div>

      <div className="card">
        <h3>Optional check-in</h3>
        <p className="muted">
          Skip any time. Private check-ins count for the streak but hide what you chose.
          You earn 5 coins once a day, whatever you pick.
        </p>
        <div className="chips">
          {acts.map(a => (
            <button key={a.id} className={'chip ' + (sel === a.id ? 'on' : '')}
                    onClick={() => setSel(a.id)}>{a.emoji} {a.label}</button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={priv} onChange={e => setPriv(e.target.checked)} />
          Keep details private
        </label>
        <button onClick={checkIn} disabled={!sel}>Check in</button>
        {msg && <p className="muted">{msg}</p>}
      </div>

      <div className="card">
        <h3>Activity feed</h3>
        {feed.length === 0 && <p className="muted">Nothing yet.</p>}
        {feed.map(f => (
          <p key={f.id}>
            <b>{f.who}</b> {f.is_private ? 'checked in privately 🔒' : 'checked in: ' + f.what}
            <span className="muted"> · {f.day}</span>
          </p>
        ))}
      </div>
            <Levels roomId={id} onChange={load} />
            <Chat roomId={id} />
    </div>
  )
}