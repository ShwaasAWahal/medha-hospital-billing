import { NavLink } from 'react-router-dom'

function Sidebar({ employee }) {
  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/patients', label: 'Patients' },
    { to: '/services', label: 'Services' },
  ]

  if (employee?.role === 'Admin') {
    links.push(
      { to: '/employees', label: 'Employees' },
      { to: '/reports', label: 'Reports' },
      { to: '/audit-logs', label: 'Audit Logs' },
    )
  }

  links.push(
    { to: '/bills', label: 'Bills' },
    { to: '/settings', label: 'Settings' },
  )

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="logo.png" alt="MEDHA HOSPITAL Logo" className="brand-logo" />
        <span>MEDHA HOSPITAL</span>
      </div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar

