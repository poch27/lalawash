import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import QRCode from '../components/QRCode'

export default function CustomerView() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const { data: wallet, error: rpcErr } = await supabase.rpc('get_my_wallet', { p_token: token })
        if (rpcErr) throw rpcErr
        setData(wallet)
      } catch (e) {
        setError(e.message || 'Link not valid')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [token])

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app-body text-center" style={{ paddingTop: 80 }}>
          <div style={{ fontSize: 36 }}>🧺</div>
          <p style={{ marginTop: 12, color: 'var(--muted)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    const customer = Array.isArray(data) ? data[0] : data
    if (!customer && error) {
      return (
        <div className="app-shell">
          <div className="app-body text-center" style={{ paddingTop: 80 }}>
            <div style={{ fontSize: 48 }}>😕</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>Link Not Valid</h2>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 8 }}>
              This wallet link is invalid or has expired.
            </p>
          </div>
        </div>
      )
    }
  }

  // get_my_wallet (returns jsonb) gives: name, tier, paid, bonus, total,
  // perks_active, perks_until, members, transactions[{date, type, amount, description, member}]
  const customer = Array.isArray(data) ? data[0] : data
  const total = customer?.total ?? 0
  const paid = customer?.paid ?? 0
  const bonus = customer?.bonus ?? 0
  const perksActive = customer?.perks_active
  const perksUntil = customer?.perks_until
  const transactions = customer?.transactions || []
  const until = perksUntil
    ? new Date(perksUntil).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    : null

  return (
    <div className="app-shell">
      <div className="cust-brand">
        <span>🧺</span> Lala Wash Wallet
      </div>
      <div className="readonly-tag">Your balance — view only</div>

      <div className="app-body">
        <div className="balcard">
          <div className="lbl">{customer?.name || 'Customer'}</div>
          <div className="amt">₱{Number(total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
          <div className="split">
            Paid ₱{Number(paid).toLocaleString('en-PH', { minimumFractionDigits: 2 })} · Bonus ₱{Number(bonus).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            {until && ` (expires ${until})`}
          </div>
          <div className={`pill ${perksActive ? 'active' : 'expired'}`}>
            {perksActive ? `● ACTIVE until ${until}` : 'EXPIRED — reload ₱1,000+ to renew'}
          </div>
        </div>

        {/* QR Code — i-scan ng staff */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px',
            background: '#fff',
            borderRadius: 16,
            marginBottom: 16,
            border: '1.5px solid var(--border)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>
            🧺 Show this QR to staff
          </div>
          <QRCode value={token} size={140} />
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: 'var(--muted)',
              textAlign: 'center',
              maxWidth: 200,
              wordBreak: 'break-all',
            }}
          >
            {token}
          </div>
        </div>

        {transactions.length > 0 && (
          <div>
            <div className="sec-lbl">Recent Transactions</div>
            {transactions.map((txn, i) => {
              const isCredit = (txn.amount ?? 0) >= 0
              const date = txn.date
                ? new Date(txn.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : ''
              return (
                <div className="txn" key={i}>
                  <div className="ico">{isCredit ? '💰' : '👕'}</div>
                  <div className="t-meta">
                    <div className="t-nm">{txn.description || (isCredit ? 'Load' : 'Deduct')}</div>
                    <div className="t-dt">{date}</div>
                  </div>
                  <div className={`t-amt ${isCredit ? 'credit' : 'debit'}`}>
                    {isCredit ? '+' : '−'}₱{Math.abs(txn.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="footer-cta">
          Mag-reload sa counter — cash o GCash.<br />
          Balance mo, ikaw lang ang nakakakita. 🔒
        </div>
      </div>
    </div>
  )
}
