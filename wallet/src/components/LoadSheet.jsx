import { useState } from 'react'

const PRESETS = [1000, 2000]
const MIN_LOAD = 200

export default function LoadSheet({ onClose, onConfirm, customer }) {
  const [amount, setAmount] = useState(1000)
  const [custom, setCustom] = useState('')
  const [method, setMethod] = useState('Cash')
  const [busy, setBusy] = useState(false)

  const finalAmount = custom ? parseInt(custom, 10) : amount
  const isValid = finalAmount >= MIN_LOAD

  // Check if customer already got founding bonus
  // (We show preview regardless — RPC handles the one-time logic)
  const showBonus = finalAmount >= 1000
  const estimatedBonus = customer?.tier === 'founder' ? 300 : 100

  async function handleConfirm() {
    if (!isValid || busy) return
    setBusy(true)
    try {
      await onConfirm(finalAmount, method)
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
        <div className="sheet-title">💰 Load Wallet</div>

        <div className="presets">
          {PRESETS.map((p) => (
            <div
              key={p}
              className={`preset ${!custom && amount === p ? 'sel' : ''}`}
              onClick={() => { setAmount(p); setCustom('') }}
            >
              ₱{p.toLocaleString()}
            </div>
          ))}
          <div
            className={`preset ${custom ? 'sel' : ''}`}
            onClick={() => setCustom('500')}
          >
            Custom
          </div>
        </div>

        {custom !== '' && (
          <input
            className="input"
            type="number"
            min={MIN_LOAD}
            step="100"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Enter amount"
            autoFocus
          />
        )}

        <div className="toggle">
          <div className={`opt ${method === 'Cash' ? 'sel' : ''}`} onClick={() => setMethod('Cash')}>
            💵 Cash
          </div>
          <div className={`opt ${method === 'GCash' ? 'sel' : ''}`} onClick={() => setMethod('GCash')}>
            📱 GCash
          </div>
        </div>

        {isValid && (
          <div className="preview">
            Customer gets <b>₱{finalAmount.toLocaleString()}</b>
            {showBonus && (
              <> (+₱{estimatedBonus} bonus)</>
            )}
          </div>
        )}

        {!isValid && finalAmount > 0 && (
          <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: 12 }}>
            Minimum load is ₱{MIN_LOAD}
          </p>
        )}

        <button className="confirm" onClick={handleConfirm} disabled={!isValid || busy}>
          {busy ? 'Loading...' : `Confirm ₱${finalAmount.toLocaleString()}`}
        </button>
      </div>
    </div>
  )
}
