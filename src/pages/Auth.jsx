import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { APP_NAME } from '../config'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)

    if (mode === 'signup') {
      if (!name.trim()) {
        setErr('Please add a display name')
        setBusy(false)
        return
      }
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setErr(error.message)
      } else if (data.user && data.session) {
        const { error: pe } = await supabase
          .from('profiles')
          .insert({ id: data.user.id, display_name: name.trim() })
        if (pe) setErr(pe.message)
      } else {
        setErr('Check your email to confirm your account.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setErr(error.message)
    }
    setBusy(false)
  }

  return (
    <div className="page">
      <h1>🍭 {APP_NAME}</h1>
      <p className="muted">A cozy shared space for you and your people.</p>
      <form className="card" onSubmit={submit}>
        {mode === 'signup' && (
          <input placeholder="Display name" value={name}
                 onChange={e => setName(e.target.value)} />
        )}
        <input type="email" placeholder="Email" value={email}
               onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password (6+ characters)" minLength={6}
               value={password} onChange={e => setPassword(e.target.value)} required />
        <button disabled={busy}>{mode === 'login' ? 'Log in' : 'Sign up'}</button>
        {err && <p className="error">{err}</p>}
      </form>
      <p className="link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'New here? Sign up' : 'Have an account? Log in'}
      </p>
    </div>
  )
}