import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

const PRESET_DESC = ['Wash & Fold', 'Dry Clean', 'Comforter']

export default function DeductSheet({ onClose, onConfirm, balance, members, selectedMember }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState(PRESET_DESC[0])
  const [customDesc, setCustomDesc] = useState(false)
  const [member, setMember] = useState(selectedMember || '')
  const [busy, setBusy] = useState(false)

  const total = balance?.total ?? 0
  const finalAmount = parseInt(amount, 10) || 0
  const insufficient = finalAmount > total
  const isValid = finalAmount > 0 && !insufficient

  async function handleConfirm() {
    if (!isValid || busy) return
    setBusy(true)
    try {
      const desc = customDesc ? description : description
      await onConfirm(finalAmount, desc, member || null)
      onClose()
    } catch (e) {
      // error surfaced by parent
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-title">💸 Deduct / Bawas</div>

        <input
          className="input"
          type="number"
          placeholder="Amount (₱)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />

        <div className="presets">
          {PRESET_DESC.map((d) => (
            <div
              key={d}
              className={`preset ${!customDesc && description === d ? 'sel' : ''}`}
              onClick={() => { setDescription(d); setCustomDesc(false) }}
            >
              {d}
            </div>
          ))}
          <div
            className={`preset ${customDesc ? 'sel' : ''}`}
            onClick={() => setCustomDesc(true)}
          >
            Other
          </div>
        </div>

        {customDesc && (
          <input
            className="input"
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        )}

        {members && members.length > 1 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
              Sino ang nag-drop off?
            </label>
            <select
              className="input"
              value={member}
              onChange={(e) => setMember(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              <option value="">Primary / Walk-in</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}

        {insufficient && amount && (
          <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: 12 }}>
            Kulang ang balance — have ₱{total.toLocaleString()}, need ₱{finalAmount.toLocaleString()}
          </p>
        )}

        <button className="confirm" onClick={handleConfirm} disabled={!isValid || busy} style={{ background: 'var(--navy)' }}>
          {busy ? 'Processing...' : finalAmount > 0 ? `Deduct ₱${finalAmount.toLocaleString()}` : 'Deduct'}
        </button>
      </div>
    </div>
  )
}
