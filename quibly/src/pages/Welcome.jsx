import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { APP_NAME } from '../config'

export default function Welcome() {
  const nav = useNavigate()
  const [rooms, setRooms] = useState([])
  const [createName, setCreateName] = useState('')
  const [createPw, setCreatePw] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinPw, setJoinPw] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.from('rooms').select('id,name,code').then(({ data }) => setRooms(data || []))
  }, [])

  async function createRoom() {
    setErr('')
    const { data, error } = await supabase.rpc('create_room', {
      p_name: createName,
      p_password: createPw,
    })
    if (error) setErr(error.message)
    else nav('/room/' + data)
  }

  async function joinRoom() {
    setErr('')
    const { data, error } = await supabase.rpc('join_room', {
      p_code: joinCode,
      p_password: joinPw,
    })
    if (error) setErr(error.message)
    else nav('/room/' + data)
  }

  return (
    <div className="page">
      <div className="top">
        <h1>🍭 {APP_NAME}</h1>
        <button className="alt" onClick={() => supabase.auth.signOut()}>Log out</button>
      </div>

      {rooms.length > 0 && (
        <div className="card">
          <h3>Your rooms</h3>
          {rooms.map(r => (
            <p key={r.id}>
              <Link to={'/room/' + r.id}>{r.name}</Link>{' '}
              <span className="muted">code {r.code}</span>
            </p>
          ))}
        </div>
      )}

      <div className="card">
        <h3>✨ Create a room</h3>
        <input placeholder="Room name" value={createName}
               onChange={e => setCreateName(e.target.value)} />
        <input type="password" placeholder="Room password (4+ characters)"
               value={createPw} onChange={e => setCreatePw(e.target.value)} />
        <button onClick={createRoom}>Create</button>
      </div>

      <div className="card">
        <h3>🔑 Join a room</h3>
        <input placeholder="Room code" value={joinCode}
               onChange={e => setJoinCode(e.target.value)} />
        <input type="password" placeholder="Room password"
               value={joinPw} onChange={e => setJoinPw(e.target.value)} />
        <button onClick={joinRoom}>Join</button>
      </div>

      {err && <p className="error">{err}</p>}
    </div>
  )
}