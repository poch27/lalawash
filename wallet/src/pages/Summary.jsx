import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useToast } from '../components/Toast'

export default function Summary() {
  const navigate = useNavigate()
  const toast = useToast()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState(null)
  const [auditLog, setAuditLog] = useState([])
  const [loading, setLoading] = useState(false)

  // Adjust state
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustCustomerId, setAdjustCustomerId] = useState('')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  async function fetchSummary() {
    setLoading(true)
    try {
      const [sumRes, auditRes] = await Promise.all([
        supabase.rpc('daily_summary', { p_day: date }),
        supabase.from('audit_log').select('*').eq('day', date).order('created_at', { ascending: false }).limit(50),
      ])

      if (sumRes.error) throw sumRes.error
      setSummary(Array.isArray(sumRes.data) ? sumRes.data[0] : sumRes.data)
      setAuditLog(auditRes.data || [])
    } catch (e) {
      toast(e.message || 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [date])

  async function handleAdjust(e) {
    e.preventDefault()
    if (!adjustCustomerId || !adjustAmount || !adjustReason) return
    try {
      const { error } = await supabase.rpc('adjust_wallet', {
        p_customer: adjustCustomerId,
        p_amount: parseInt(adjustAmount, 10),
        p_reason: adjustReason,
      })
      if (error) throw error
      toast('Wallet adjusted!')
      setShowAdjust(false)
      setAdjustCustomerId('')
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

  return (
    <div className="app-body">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Link to="/" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4, textDecoration: 'none' }}>
          ←
        </Link>
        <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>Daily Summary</h2>
      </div>

      <input
        className="input"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{ marginBottom: 16 }}
      />

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
              <div className="s-lbl">Transactions Today</div>
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
            💵 <strong>Expected cash in drawer:</strong> ₱{Number(cashLoaded).toLocaleString()}
          </div>

          <div style={{ marginBottom: 12 }}>
            <button
              className="btn"
              onClick={() => setShowAdjust(!showAdjust)}
              style={{ width: '100%', background: 'var(--amber)', color: '#fff' }}
            >
              🔧 Adjust Wallet (Owner)
            </button>
          </div>

          {showAdjust && (
            <form onSubmit={handleAdjust} style={{ marginBottom: 16 }}>
              <input
                className="input"
                placeholder="Customer ID (UUID)"
                value={adjustCustomerId}
                onChange={(e) => setAdjustCustomerId(e.target.value)}
                required
              />
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
                  {' · '}{entry.staff_name || entry.details || ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
