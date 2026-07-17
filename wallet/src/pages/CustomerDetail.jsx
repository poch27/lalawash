import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useToast } from '../components/Toast'
import BalanceCard from '../components/BalanceCard'
import PerkChips from '../components/PerkChips'
import TransactionList from '../components/TransactionList'
import LoadSheet from '../components/LoadSheet'
import DeductSheet from '../components/DeductSheet'
import QRCode from '../components/QRCode'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [customer, setCustomer] = useState(null)
  const [balance, setBalance] = useState(null)
  const [perks, setPerks] = useState(null)
  const [claims, setClaims] = useState([])
  const [transactions, setTransactions] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLoad, setShowLoad] = useState(false)
  const [showDeduct, setShowDeduct] = useState(false)
  const [scanMember, setScanMember] = useState(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberMobile, setNewMemberMobile] = useState('')

  // Check if navigated from QR scan
  useEffect(() => {
    const scanned = sessionStorage.getItem(`scan_${id}`)
    if (scanned) {
      setScanMember(scanned)
      sessionStorage.removeItem(`scan_${id}`)
    }
  }, [id])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [custRes, balRes, perkRes, claimRes, txnRes, memberRes] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).single(),
        supabase.rpc('get_balance', { p_customer: id }),
        supabase.rpc('get_perks', { p_customer: id }),
        supabase.from('perk_claims').select('*').eq('customer_id', id),
        supabase.from('wallet_transactions').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(50),
        supabase.from('wallet_members').select('*').eq('customer_id', id).order('is_primary', { ascending: false }),
      ])

      if (custRes.error) throw custRes.error
      setCustomer(custRes.data)
      setBalance(balRes.data?.[0] || { paid: 0, bonus: 0, total: 0 })
      setPerks(perkRes.data?.[0] || null)
      setClaims(claimRes.data || [])
      setTransactions(txnRes.data || [])
      setMembers(memberRes.data || [])
    } catch (e) {
      console.error('Fetch detail error:', e)
      toast('Failed to load customer data')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleLoad(amount, method) {
    try {
      const { data, error } = await supabase.rpc('load_wallet', {
        p_customer: id,
        p_amount: amount,
        p_method: method.toLowerCase(),
      })
      if (error) throw error
      const row = data?.[0]
      toast(`Loaded ₱${amount.toLocaleString()}! New balance: ₱${(row?.total ?? 0).toLocaleString()}`)
      fetchData()
    } catch (e) {
      toast(e.message || 'Load failed')
    }
  }

  async function handleDeduct(amount, description, member) {
    try {
      const params = { p_customer: id, p_amount: amount, p_description: description }
      if (member) params.p_member = member
      const { data, error } = await supabase.rpc('deduct_wallet', params)
      if (error) throw error
      const row = data?.[0]
      toast(`Deducted ₱${amount.toLocaleString()} — remaining: ₱${(row?.total ?? 0).toLocaleString()}`)
      setScanMember(null)
      fetchData()
    } catch (e) {
      toast(e.message || 'Deduct failed')
    }
  }

  async function handleClaim(perk) {
    try {
      const { error } = await supabase.rpc('claim_perk', { p_customer: id, p_perk: perk })
      if (error) throw error
      toast(`${perk === 'welcome_drink' ? 'Welcome drink' : 'Birthday wash'} claimed!`)
      fetchData()
    } catch (e) {
      toast(e.message || 'Claim failed')
    }
  }

  async function handleVoid(txnId, reason) {
    try {
      const { error } = await supabase.rpc('void_transaction', { p_txn: txnId, p_reason: reason })
      if (error) throw error
      toast('Transaction voided')
      fetchData()
    } catch (e) {
      toast(e.message || 'Void failed')
    }
  }

  async function handleAddMember(e) {
    e.preventDefault()
    if (!newMemberName.trim()) return
    try {
      const payload = { customer_id: id, name: newMemberName.trim() }
      if (newMemberMobile.trim()) payload.mobile = newMemberMobile.trim()
      const { error } = await supabase.from('wallet_members').insert(payload)
      if (error) throw error
      toast(`${newMemberName} added as member!`)
      setNewMemberName('')
      setNewMemberMobile('')
      setShowAddMember(false)
      fetchData()
    } catch (e) {
      toast(e.message || 'Failed to add member')
    }
  }

  if (loading) return <div className="app-body text-center">Loading...</div>
  if (!customer) return <div className="app-body text-center">Customer not found.</div>

  const badgeClass = customer.tier === 'founder' ? 'founder' : 'starter'

  return (
    <div className="app-body">
      <div className="cust-head">
        <div className="avatar" style={{ width: 44, height: 44 }}>{customer.full_name?.charAt(0)}</div>
        <div style={{ flex: 1 }}>
          <div className="nm">{customer.full_name}</div>
          <div className="mb">{customer.mobile} · <span className={`badge ${badgeClass}`}>{customer.tier}</span></div>
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: 4 }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--surface)',
          borderRadius: 12,
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 13,
        }}
      >
        <span style={{ color: 'var(--muted)', flex: 1 }}>Nawalan ng wallet link?</span>
        <button
          onClick={() => {
            const link = `${window.location.origin}/w/${customer.access_token}`
            navigator.clipboard.writeText(link).then(() => toast('Wallet link copied!'))
          }}
          style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
        >
          📋 Copy Link
        </button>
        <button
          onClick={() => {
            const link = `${window.location.origin}/w/${customer.access_token}`
            window.open(`sms:?body=Your Lala Wash Wallet: ${link}`, '_blank')
          }}
          style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
        >
          💬 Send SMS
        </button>
      </div>

      <BalanceCard balance={balance} perks={perks} />
      <PerkChips perks={perks} claims={claims} onClaim={handleClaim} customer={customer} />

      {/* Members Section (S9) */}
      <div style={{ marginBottom: 16 }}>
        <div className="sec-lbl">
          Family Members{members.length > 0 ? ` (${members.length})` : ''}
        </div>
        {members.map((m) => (
          <div className="member-row" key={m.id}>
            <span className="m-name">{m.name}</span>
            {m.is_primary && <span className="m-primary">PRIMARY</span>}
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              <QRCode value={m.qr_token || ''} size={48} />
            </div>
          </div>
        ))}
        {!showAddMember && (
          <button
            onClick={() => setShowAddMember(true)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1.5px dashed var(--border)',
              borderRadius: 12,
              background: 'var(--surface)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--blue)',
              cursor: 'pointer',
              marginTop: 6,
            }}
          >
            + Add Family Member
          </button>
        )}
        {showAddMember && (
          <form onSubmit={handleAddMember} style={{ marginTop: 8 }}>
            <input
              className="input"
              placeholder="Member name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              required
            />
            <input
              className="input"
              placeholder="Mobile (optional)"
              value={newMemberMobile}
              onChange={(e) => setNewMemberMobile(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                className="btn"
                style={{ flex: 1, background: 'var(--blue)', color: '#fff' }}
              >
                Add
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setShowAddMember(false)}
                style={{ flex: 1, background: 'var(--surface)', color: 'var(--text)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="btnrow">
        <button className="btn btn-load" onClick={() => setShowLoad(true)}>💰 Load</button>
        <button className="btn btn-deduct" onClick={() => setShowDeduct(true)}>
          💸 Deduct{scanMember ? ` (scanned)` : ''}
        </button>
      </div>

      <TransactionList transactions={transactions} onVoid={handleVoid} balance={balance} />

      {showLoad && (
        <LoadSheet
          onClose={() => setShowLoad(false)}
          onConfirm={handleLoad}
          customer={customer}
        />
      )}

      {showDeduct && (
        <DeductSheet
          onClose={() => { setShowDeduct(false); setScanMember(null) }}
          onConfirm={handleDeduct}
          balance={balance}
          members={members}
          selectedMember={scanMember}
        />
      )}
    </div>
  )
}
