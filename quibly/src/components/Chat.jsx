import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Chat({ roomId }) {
  const [msgs, setMsgs] = useState([])
  const [names, setNames] = useState({})
  const [me, setMe] = useState(null)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const box = useRef(null)

  useEffect(() => {
    let channel
    async function start() {
      const u = await supabase.auth.getUser()
      setMe(u.data.user && u.data.user.id)

      const p = await supabase.from('profiles').select('id,display_name')
      if (p.data) setNames(Object.fromEntries(p.data.map(x => [x.id, x.display_name])))

      const m = await supabase.from('messages').select('*').eq('room_id', roomId)
        .order('created_at', { ascending: true }).limit(100)
      if (m.error) setErr(m.error.message)
      else setMsgs(m.data)

      channel = supabase.channel('room-' + roomId)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: 'room_id=eq.' + roomId },
          payload => setMsgs(list =>
            list.some(x => x.id === payload.new.id) ? list : [...list, payload.new]))
        .subscribe()
    }
    start()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [roomId])

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight
  }, [msgs])

  async function send(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setErr('')
    const { data, error } = await supabase.from('messages')
      .insert({ room_id: roomId, user_id: me, body }).select().single()
    if (error) return setErr(error.message)
    setText('')
    setMsgs(list => list.some(x => x.id === data.id) ? list : [...list, data])
  }

  return (
    <div className="card">
      <h3>💬 Room chat</h3>
      <div className="chatbox" ref={box}>
        {msgs.length === 0 && <p className="muted">Say hi 👋</p>}
        {msgs.map(m => (
          <div key={m.id} className={'msg ' + (m.user_id === me ? 'me' : '')}>
            <small>{names[m.user_id] || 'Someone'}</small>
            {m.body}
          </div>
        ))}
      </div>
      <form className="sendrow" onSubmit={send}>
        <input value={text} onChange={e => setText(e.target.value)}
               placeholder="Say something nice…" maxLength={500} />
        <button>Send</button>
      </form>
      {err && <p className="error">{err}</p>}
    </div>
  )
}