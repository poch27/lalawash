export default function BalanceCard({ balance, perks }) {
  const total = balance?.total ?? 0
  const paid = balance?.paid ?? 0
  const bonus = balance?.bonus ?? 0

  const perksActive = perks?.active
  const until = perks?.until ? new Date(perks.until).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : null

  return (
    <div className="balcard">
      <div className="lbl">Lala Wash Wallet</div>
      <div className="amt">₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
      <div className="split">
        Paid ₱{paid.toLocaleString('en-PH', { minimumFractionDigits: 2 })} · Bonus ₱{bonus.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        {until && ` (expires ${until})`}
      </div>
      <div className={`pill ${perksActive ? 'active' : 'expired'}`}>
        {perksActive ? `● ACTIVE until ${until}` : 'EXPIRED — reload ₱1,000+ to renew'}
      </div>
    </div>
  )
}
