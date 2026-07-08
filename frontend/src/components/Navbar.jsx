import Button from './Button.jsx'

function Navbar({ employee, onLogout }) {
  const initial = employee.full_name.trim().charAt(0).toUpperCase() || 'U'

  return (
    <header className="navbar">
      <div>
        {/* <span className="navbar-label">Hospital Billing System</span> */}
      </div>
      <div className="navbar-user">
        <span className="avatar" aria-hidden="true">{initial}</span>
        <div>
          <strong>{employee.full_name}</strong>
          <small>{employee.role}</small>
        </div>
        <Button variant="danger-ghost" onClick={onLogout}>Sign out</Button>
      </div>
    </header>
  )
}

export default Navbar


