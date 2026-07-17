import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../components/Toast'
import QRScanner from '../components/QRScanner'

const BADGE_CLASS = { founder: 'founder', starter: 'starter' }

export default function Search() {
  const navigate = useNavigate()
  const { isOwner } = useAuth()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const search = useCallback(async (q) => {
    setLoading(true)
    try {
      let request = supabase
        .from('customers')
        .select('id, full_name, mobile, tier')
        .eq('is_active', true)

      const trimmed = q.trim()
      if (trimmed.length >= 1) {
        request = request.or(`full_name.ilike.%${trimmed}%,mobile.ilike.%${trimmed}%`)
      } else {
        // No query yet: show the customer list so staff has something to browse.
        request = request.order('full_name', { ascending: true })
      }

      const { data, error } = await request.limit(50)
      if (error) throw error
      setCustomers(data || [])
    } catch (e) {
      console.error('Search error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  async function handleScan(qrText) {
    setShowScanner(false)
    try {
      const { data, error } = await supabase.rpc('scan_qr', { p_qr: qrText })
      if (error) throw error
      if (!data || data.length === 0) {
        toast('QR not recognized')
        return
      }
      const scanned = Array.isArray(data) ? data[0] : data
      // Store scanned member so CustomerDetail pre-selects them
      sessionStorage.setItem(`scan_${scanned.customer_id}`, scanned.member_id)
      navigate(`/customer/${scanned.customer_id}`)
    } catch (e) {
      toast(e.message || 'QR not recognized')
    }
  }

  return (
    <div className="app-body">
      <input
        className="search-input"
        type="text"
        placeholder="Search by name or mobile..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => setShowScanner(true)}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1.5px solid var(--border)',
            borderRadius: 12,
            background: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          📷 Scan QR
        </button>
        {isOwner && (
          <Link to="/summary" style={{
            flex: 1,
            padding: '10px 14px',
            border: '1.5px solid var(--border)',
            borderRadius: 12,
            background: '#fff',
            fontSize: 14,
            fontWeight: 600,
            textAlign: 'center',
            textDecoration: 'none',
            color: 'var(--text)',
          }}>
            📊 Summary
          </Link>
        )}
      </div>

      {loading && <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Searching...</p>}

      {!loading && customers.length === 0 && (
        <p style={{ fontSize: '14px', color: 'var(--muted)', textAlign: 'center', marginTop: 40 }}>
          {query ? 'No customers found.' : 'Wala pang customer. Tap + to add one.'}
        </p>
      )}

      {customers.map((c) => (
        <div
          key={c.id}
          className="customer-row"
          onClick={() => navigate(`/customer/${c.id}`)}
        >
          <div className="avatar">{c.full_name?.charAt(0) || '?'}</div>
          <div className="crow-meta">
            <div className="crow-name">{c.full_name}</div>
            <div className="crow-mobile">{c.mobile}</div>
          </div>
          <span className={`badge ${BADGE_CLASS[c.tier] || 'starter'}`}>{c.tier || 'starter'}</span>
        </div>
      ))}

      <button className="fab" onClick={() => navigate('/new')} title="New Customer">
        +
      </button>

      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
