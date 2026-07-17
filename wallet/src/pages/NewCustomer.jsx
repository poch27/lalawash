import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useToast } from '../components/Toast'

export default function NewCustomer() {
  const navigate = useNavigate()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null) // { access_token, full_name }

  const [form, setForm] = useState({
    full_name: '',
    mobile: '',
    email: '',
    tier: 'starter',
    birthday_month: '',
  })

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const payload = {
        full_name: form.full_name.trim(),
        mobile: form.mobile.trim(),
        tier: form.tier,
      }
      if (form.email.trim()) payload.email = form.email.trim()
      if (form.birthday_month) payload.birthday_month = parseInt(form.birthday_month, 10)

      const { data, error } = await supabase
        .from('customers')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      setCreated(data)
      toast('Customer created!')
    } catch (e) {
      toast(e.message || 'Failed to create customer')
    } finally {
      setBusy(false)
    }
  }

  function copyLink() {
    const link = `${window.location.origin}/w/${created.access_token}`
    navigator.clipboard.writeText(link).then(() => toast('Link copied!'))
  }

  function shareSMS() {
    const link = `${window.location.origin}/w/${created.access_token}`
    window.open(`sms:?body=Your Lala Wash Wallet: ${link}`, '_blank')
  }

  if (created) {
    const link = `${window.location.origin}/w/${created.access_token}`
    return (
      <div className="app-body" style={{ textAlign: 'center', paddingTop: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Customer Created!</h2>
        <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 20 }}>
          {created.full_name} · {created.tier?.toUpperCase()}
        </p>

        <div style={{
          background: 'var(--surface)',
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
          wordBreak: 'break-all',
          fontSize: 14,
        }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>
            Customer Link
          </div>
          {link}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-load" onClick={copyLink}>
            📋 Copy Link
          </button>
          <button className="btn" style={{ background: 'var(--blue)', color: '#fff' }} onClick={shareSMS}>
            💬 Share via SMS
          </button>
        </div>

        <button
          className="btn"
          style={{ width: '100%', marginTop: 12, background: 'var(--navy)', color: '#fff' }}
          onClick={() => navigate('/')}
        >
          Back to Search
        </button>
      </div>
    )
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  return (
    <div className="app-body">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4 }}
        >
          ←
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>New Customer</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Full Name *</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            required
            placeholder="Juan dela Cruz"
          />
        </div>

        <div className="form-group">
          <label>Mobile *</label>
          <input
            type="text"
            value={form.mobile}
            onChange={(e) => update('mobile', e.target.value)}
            required
            placeholder="+639XX XXX XXXX"
          />
        </div>

        <div className="form-group">
          <label>Email (optional)</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="juan@example.com"
          />
        </div>

        <div className="form-group">
          <label>Tier *</label>
          <select value={form.tier} onChange={(e) => update('tier', e.target.value)}>
            <option value="starter">Starter</option>
            <option value="founder">Founder</option>
          </select>
        </div>

        <div className="form-group">
          <label>Birthday Month (optional)</label>
          <select
            value={form.birthday_month}
            onChange={(e) => update('birthday_month', e.target.value)}
          >
            <option value="">—</option>
            {months.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>

        <button
          className="confirm"
          type="submit"
          disabled={busy}
          style={{ marginTop: 8 }}
        >
          {busy ? 'Creating...' : 'Create Customer'}
        </button>
      </form>
    </div>
  )
}
