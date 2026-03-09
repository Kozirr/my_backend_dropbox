import './Header.css'

interface HeaderProps {
  email: string
  onSignOut: () => void
}

function Header({ email, onSignOut }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-logo">☁</span>
        <h1 className="header-title">DropBox Clone</h1>
      </div>
      <div className="header-user">
        <span className="header-email">{email}</span>
        <button className="header-signout" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </header>
  )
}

export default Header
