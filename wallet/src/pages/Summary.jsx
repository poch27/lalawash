import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useToast } from '../components/Toast'
import { useAuth } from '../auth/AuthContext'

function monthRange(monthStr) {
  // monthStr = "YYYY-MM"
  const [y, m] = monthStr.split('-').map(Number)
  const from = `${monthStr}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to = `${monthStr}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

export default function Summary() {
  const navigate = useNavigate()
  const toast = useToast()
  const { isOwner } = useAuth()

  const [view, setView] = useState('day') // 'day' | 'month'
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [summary, setSummary] = useState(null)
  const [auditLog, setAuditLog] = useState([])
  const [loading, setLoading] = useState(false)

  // Adjust state
  const [showAdjust, setShowAdjust] = useState(false)
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  useEffect(() => {
    if (!showAdjust) return undefined

    const timer = setTimeout(async () => {
      setCustomerSearchLoading(true)
      try {
        let request = supabase
          .from('customers')
          .select('id, full_name, mobile, tier')
          .eq('is_active', true)
        const trimmed = customerQuery.trim()
        if (trimmed) {
          request = request.or(`full_name.ilike.%${trimmed}%,mobile.ilike.%${trimmed}%`)
        } else {
          request = request.order('full_name', { ascending: true })
        }
        const { data, error } = await request.limit(50)
        if (error) throw error
        setCustomerResults(data || [])
      } catch (e) {
        toast(e.message || 'Failed to search customers')
      } finally {
        setCustomerSearchLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [showAdjust, customerQuery, toast])

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      let from, to
      if (view === 'month') {
        ;({ from, to } = monthRange(month))
      } else {
        from = date
        to = date
      }

      const [sumRes, auditRes] = await Promise.all([
        view === 'month'
          ? supabase.rpc('period_summary', { p_from: from, p_to: to })
          : supabase.rpc('daily_summary', { p_day: date }),
        supabase.from('audit_log').select('*')
          .gte('created_at', `${from}T00:00:00`)
          .lte('created_at', `${to}T23:59:59`)
          .order('created_at', { ascending: false }).limit(50),
      ])

      if (sumRes.error) throw sumRes.error
      // daily_summary is `returns jsonb` (plain object); period_summary is also
      // `returns jsonb` (plain object) — neither needs [0] indexing. Guard with
      // Array.isArray anyway in case that ever changes.
      setSummary(Array.isArray(sumRes.data) ? sumRes.data[0] : sumRes.data)
      setAuditLog(auditRes.data || [])
    } catch (e) {
      toast(e.message || 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }, [view, date, month, toast])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  async function handleAdjust(e) {
    e.preventDefault()
    if (!selectedCustomer || !adjustAmount || !adjustReason) return
    try {
      const { error } = await supabase.rpc('adjust_wallet', {
        p_customer: selectedCustomer.id,
        p_amount: parseInt(adjustAmount, 10),
        p_reason: adjustReason,
      })
      if (error) throw error
      toast('Wallet adjusted!')
      setShowAdjust(false)
      setCustomerQuery('')
      setCustomerResults([])
      setSelectedCustomer(null)
      setAdjustAmount('')
      setAdjustReason('')
      fetchSummary()
    } catch (e) {
      toast(e.message || 'Adjust failed')
    }
  }

  const cashLoaded = summary?.cash_loaded ?? summary?.total_loaded ?? 0
  const gcashLoaded = summary?.gcash_loaded ?? 0
  const totalDeducted = summary?.total_deducted ?? 0
  const bonusGranted = summary?.bonus_granted ?? 0
  const txnCount = summary?.txn_count ?? 0
  const byDay = summary?.by_day ?? []
  const byStaff = summary?.by_staff ?? []

  return (
    <div className="app-body">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Link to="/" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4, textDecoration: 'none' }}>
          ←
        </Link>
        <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>
          {view === 'month' ? 'Monthly Summary' : 'Daily Summary'}
        </h2>
      </div>

      <div className="toggle" style={{ marginBottom: 12 }}>
        <div className={`opt ${view === 'day' ? 'sel' : ''}`} onClick={() => setView('day')}>
          Day
        </div>
        <div className={`opt ${view === 'month' ? 'sel' : ''}`} onClick={() => setView('month')}>
          Month
        </div>
      </div>

      {view === 'day' ? (
        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ marginBottom: 16 }}
        />
      ) : (
        <input
          className="input"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ marginBottom: 16 }}
        />
      )}

      {loading && <p style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>Loading...</p>}

      {summary && (
        <>
          <div className="summary-cards">
            <div className="summary-card">
              <div className="s-val" style={{ color: 'var(--green)' }}>₱{Number(cashLoaded).toLocaleString()}</div>
              <div className="s-lbl">Cash Loaded</div>
            </div>
            <div className="summary-card">
              <div className="s-val" style={{ color: 'var(--blue)' }}>₱{Number(gcashLoaded).toLocaleString()}</div>
              <div className="s-lbl">GCash Loaded</div>
            </div>
            <div className="summary-card">
              <div className="s-val" style={{ color: 'var(--red)' }}>₱{Number(totalDeducted).toLocaleString()}</div>
              <div className="s-lbl">Total Deducted</div>
            </div>
            <div className="summary-card">
              <div className="s-val" style={{ color: '#7C3AED' }}>₱{Number(bonusGranted).toLocaleString()}</div>
              <div className="s-lbl">Bonus Granted</div>
            </div>
            <div className="summary-card" style={{ gridColumn: '1 / -1' }}>
              <div className="s-val">{txnCount}</div>
              <div className="s-lbl">Transactions {view === 'month' ? 'This Month' : 'Today'}</div>
            </div>
          </div>

          <div style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            fontSize: 14,
            color: '#065F46',
          }}>
            💵 <strong>Expected cash {view === 'month' ? 'received' : 'in drawer'}:</strong> ₱{Number(cashLoaded).toLocaleString()}
          </div>

          {view === 'month' && byDay.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="sec-lbl">Per Day</div>
              {byDay.map((d) => (
                <div className="txn" key={d.day}>
                  <div className="ico">📅</div>
                  <div className="t-meta">
                    <div className="t-nm">{new Date(d.day).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>
                    <div className="t-dt">{d.txns} txn{d.txns === 1 ? '' : 's'}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13 }}>
                    <div style={{ color: 'var(--green)', fontWeight: 600 }}>+₱{Number(d.loaded).toLocaleString()}</div>
                    <div style={{ color: 'var(--red)' }}>−₱{Number(d.deducted).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'month' && byStaff.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="sec-lbl">Per Staff</div>
              {byStaff.map((s) => (
                <div className="txn" key={s.name}>
                  <div className="ico">👤</div>
                  <div className="t-meta">
                    <div className="t-nm">{s.name}</div>
                    <div className="t-dt">{s.txns} txn{s.txns === 1 ? '' : 's'}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13 }}>
                    <div style={{ color: 'var(--green)', fontWeight: 600 }}>+₱{Number(s.loaded).toLocaleString()}</div>
                    <div style={{ color: 'var(--red)' }}>−₱{Number(s.deducted).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isOwner && (
            <div style={{ marginBottom: 12 }}>
              <button
                className="btn"
                onClick={() => setShowAdjust(!showAdjust)}
                style={{ width: '100%', background: 'var(--amber)', color: '#fff' }}
              >
                🔧 Adjust Wallet (Owner)
              </button>
            </div>
          )}

          {isOwner && showAdjust && (
            <form onSubmit={handleAdjust} style={{ marginBottom: 16 }}>
              <input
                className="search-input"
                placeholder="Search customer by name or mobile..."
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value)
                  setSelectedCustomer(null)
                }}
                required
              />
              {customerSearchLoading && (
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '8px 0' }}>Searching...</p>
              )}
              {!selectedCustomer && !customerSearchLoading && customerResults.map((customer) => (
                <button
                  type="button"
                  key={customer.id}
                  className="customer-row"
                  onClick={() => {
                    setSelectedCustomer(customer)
                    setCustomerQuery(customer.full_name)
                  }}
                  style={{ width: '100%', textAlign: 'left' }}
                >
                  <span className="avatar">{customer.full_name?.charAt(0) || '?'}</span>
                  <span className="crow-meta">
                    <span className="crow-name">{customer.full_name}</span>
                    <span className="crow-mobile">{customer.mobile}</span>
                  </span>
                  <span className={`badge ${customer.tier === 'founder' ? 'founder' : 'starter'}`}>
                    {customer.tier || 'starter'}
                  </span>
                </button>
              ))}
              {selectedCustomer && (
                <div className="customer-row" style={{ marginBottom: 8 }}>
                  <div className="avatar">{selectedCustomer.full_name?.charAt(0) || '?'}</div>
                  <div className="crow-meta">
                    <div className="crow-name">{selectedCustomer.full_name}</div>
                    <div className="crow-mobile">{selectedCustomer.mobile}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    style={{ border: 0, background: 'none', color: 'var(--blue)', cursor: 'pointer' }}
                  >
                    Change
                  </button>
                </div>
              )}
              <input
                className="input"
                type="number"
                placeholder="Amount (+ add, - remove)"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                required
              />
              <button type="submit" className="confirm" style={{ background: 'var(--amber)' }}>
                Confirm Adjustment
              </button>
            </form>
          )}
        </>
      )}

      {auditLog.length > 0 && (
        <div>
          <div className="sec-lbl">Audit Log</div>
          {auditLog.map((entry, i) => (
            <div className="txn" key={entry.id || i}>
              <div className="ico">📋</div>
              <div className="t-meta">
                <div className="t-nm" style={{ fontSize: 13 }}>{entry.action || entry.event}</div>
                <div className="t-dt">
                  {entry.created_at
                    ? new Date(entry.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
                    : ''}
                  {entry.detail ? ` · ${Object.entries(entry.detail).map(([k, v]) => `${k}: ${v}`).join(', ')}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
