import { useAuth } from '../auth/AuthContext'

const PRESET_DESC = ['Wash & Fold', 'Dry Clean', 'Comforter']

const ICON_MAP = {
  load: '💰',
  deduct: '👕',
  void: '↩️',
  adjust: '🔧',
  bonus: '🎁',
  expire: '⏳',
}

export default function TransactionList({ transactions, onVoid, balance }) {
  const { canVoid } = useAuth()
  const reversedTxnIds = new Set(
    (transactions || []).map((txn) => txn.reverses_txn_id).filter(Boolean),
  )

  return (
    <div>
      <div className="sec-lbl">Recent Transactions</div>
      {(!transactions || transactions.length === 0) && (
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>No transactions yet.</p>
      )}
      {transactions?.map((txn) => {
        const isCredit = txn.amount >= 0
        const kind = txn.type || (isCredit ? 'load' : 'deduct')
        const icon = ICON_MAP[kind] || (isCredit ? '💰' : '👕')
        const desc = txn.description || PRESET_DESC[0]
        const date = new Date(txn.created_at).toLocaleDateString('en-PH', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        const isVoidRow = Boolean(txn.reverses_txn_id)
        const voided = Boolean(txn.voided_at) || reversedTxnIds.has(txn.id)
        const isVoidedOriginal = voided && !isVoidRow

        return (
          <div className="txn" key={txn.id} style={voided ? { opacity: 0.5, textDecoration: 'line-through' } : {}}>
            <div className="ico">{icon}</div>
            <div className="t-meta">
              <div className="t-nm">{desc}{txn.member_name ? ` · ${txn.member_name}` : ''}</div>
              <div className="t-dt">
                {date}
                {isVoidedOriginal && ' · VOIDED'}
                {txn.is_founding_bonus && ' · Founding Bonus'}
              </div>
            </div>
            <div className={`t-amt ${isCredit ? 'credit' : 'debit'}`}>
              {isCredit ? '+' : '−'}₱{Math.abs(txn.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
            {canVoid && !voided && !isVoidRow && (
              <div
                className="t-void"
                onClick={() => {
                  const reason = prompt('Reason for void:')
                  if (reason) onVoid(txn.id, reason)
                }}
                title="Void"
              >
                ✕
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
