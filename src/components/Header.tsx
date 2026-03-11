import { NavLink } from 'react-router-dom'
import './Header.css'

interface HeaderProps {
  email: string
  displayName?: string
  onSignOut: () => void
}

function Header({ email, displayName, onSignOut }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-brand">
        <div>
          <span className="header-kicker">Workspace</span>
          <h1 className="header-title">Dropbox Clone</h1>
        </div>
      </div>
      <nav className="header-nav" aria-label="Primary">
        <NavLink
          to="/files"
          className={({ isActive }) => `header-link ${isActive ? 'header-link-active' : ''}`}
        >
          Files
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `header-link ${isActive ? 'header-link-active' : ''}`}
        >
          Profile
        </NavLink>
      </nav>
      <div className="header-user">
        <div className="header-user-copy">
          <span className="header-name">{displayName || 'Your workspace'}</span>
          <span className="header-email">{email}</span>
        </div>
        <button className="header-signout" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  )
}

export default Header
