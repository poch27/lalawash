import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)

    try {
      // Step 1: Sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email, password,
      })
      if (authError) throw authError
      if (!authData?.user) throw new Error('No user returned')

      console.log('✓ Auth OK, user:', authData.user.email)

      // Step 2: Get staff role
      const { data: staffData, error: staffError } = await supabase.rpc('current_staff')
      if (staffError) throw staffError

      const staff = Array.isArray(staffData) ? staffData[0] : staffData
      console.log('✓ Staff data:', staff)

      if (!staff) throw new Error('No staff record — contact admin')

      // Step 3: Update auth context + session + redirect
      login(authData.user, staff)
      console.log('✓ Redirecting to /')
      navigate('/', { replace: true })

    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="brand">🧺</div>
      <h1>Lala Wash Wallet</h1>
      <p className="sub">Staff login</p>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320 }}>
        <input
          className="input" type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          required autoFocus
        />
        <input
          className="input" type="password" placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign In'}
        </button>
        {error && <p className="err">{error}</p>}
      </form>
    </div>
  )
}
