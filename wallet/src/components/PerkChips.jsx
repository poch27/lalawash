export default function PerkChips({ perks, claims, onClaim, customer }) {
  if (!perks?.active) return null

  const welcomeClaimed = claims?.some(c => c.perk === 'welcome_drink')
  const birthdayClaimed = claims?.some(c => c.perk === 'birthday_wash')
  const birthdayMonth = customer?.birthday_month
  const currentMonth = new Date().getMonth() + 1
  const birthdayAvailable = birthdayMonth && birthdayMonth === currentMonth

  return (
    <div className="chips">
      <button
        className={`chip ${welcomeClaimed ? 'claimed' : ''}`}
        onClick={() => !welcomeClaimed && onClaim('welcome_drink')}
        disabled={welcomeClaimed}
      >
        {welcomeClaimed ? '✓' : '☕'} Welcome Drink
        {welcomeClaimed ? ' (Claimed)' : ''}
      </button>
      <button
        className={`chip ${birthdayClaimed ? 'claimed' : ''} ${!birthdayAvailable ? 'disabled' : ''}`}
        onClick={() => birthdayAvailable && !birthdayClaimed && onClaim('birthday_wash')}
        disabled={!birthdayAvailable || birthdayClaimed}
      >
        {birthdayClaimed ? '✓' : '🎂'} Birthday Wash
        {birthdayClaimed ? ' (Claimed)' : birthdayAvailable ? '' : ' (not this month)'}
      </button>
    </div>
  )
}
