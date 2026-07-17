import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Layout() {
  const { staff, isOwner, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <header className="appbar">
        <span className="logo">🧺</span>
        <span className="title">Lala Wash</span>
        <span className="role">{staff?.role === 'owner' ? 'Owner' : 'Staff'}</span>
        {isOwner && (
          <Link to="/summary" style={{ fontSize: '12px', color: 'var(--blue)', textDecoration: 'none' }}>
            📊
          </Link>
        )}
        <button
          onClick={handleLogout}
          style={{
            marginLeft: 'auto',
            fontSize: '12px',
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </header>
      <Outlet />
    </div>
  )
}
