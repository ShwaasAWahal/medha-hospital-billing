function Settings() {
  const settings = [
    { label: 'Hospital name', value: import.meta.env.VITE_HOSPITAL_NAME || 'Your Hospital Name' },
    { label: 'GSTIN', value: import.meta.env.VITE_HOSPITAL_GSTIN || 'Not configured' },
    { label: 'Hospital phone', value: import.meta.env.VITE_HOSPITAL_PHONE || 'Not configured' },
    { label: 'Hospital email', value: import.meta.env.VITE_HOSPITAL_EMAIL || 'Not configured' },
    { label: 'Frontend tax rate', value: `${import.meta.env.VITE_TAX_RATE_PERCENT || 18}%` },
    { label: 'API URL', value: import.meta.env.VITE_API_URL || 'http://localhost:8000' },
  ]

  return (
    <div>
      <header className="page-heading">
        <h1>Settings</h1>
        <p>Review frontend configuration used for invoices and API access.</p>
      </header>
      <section className="panel">
        <div className="settings-grid">
          {settings.map((setting) => (
            <div className="setting-item" key={setting.label}>
              <span>{setting.label}</span>
              <strong>{setting.value}</strong>
            </div>
          ))}
        </div>
        <p className="form-note settings-note">
          Update these values in the frontend environment file and restart Vite to apply changes.
        </p>
      </section>
    </div>
  )
}

export default Settings
