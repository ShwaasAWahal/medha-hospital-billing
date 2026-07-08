import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Button from '../components/Button.jsx'
import { ErrorState, LoadingState } from '../components/PageState.jsx'
import { getApiErrorMessage } from '../services/api.js'
import { getSettings, updateSettings } from '../services/settingService.js'

function Settings() {
  const { employee } = useOutletContext()
  const isAdmin = employee?.role === 'Admin'

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pin: '',
    phone: '',
    email: '',
    gstin: '',
    tax_rate: 18,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [operationError, setOperationError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const data = await getSettings()
      setForm(data)
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load hospital settings.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: name === 'tax_rate' ? Number(value) : value,
    }))
    setSuccessMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isAdmin) return

    setIsSaving(true)
    setOperationError('')
    setSuccessMessage('')
    try {
      const updated = await updateSettings(form)
      setForm(updated)
      setSuccessMessage('Settings updated successfully.')
    } catch (error) {
      setOperationError(getApiErrorMessage(error, 'Unable to update settings.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <LoadingState message="Loading settings…" />
  if (loadError) return <ErrorState message={loadError} onRetry={loadSettings} />

  return (
    <div>
      <header className="page-heading">
        <h1>Settings</h1>
        <p>
          {isAdmin
            ? 'Manage hospital profile, location details, tax configurations, and contact information.'
            : 'Review hospital profile, location details, tax configurations, and contact information.'}
        </p>
      </header>

      <section className="panel">
        <form className="form-stack" onSubmit={handleSubmit} aria-busy={isSaving}>
          <div className="form-grid">
            <label className="full-width-field">
              Hospital Name
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                disabled={!isAdmin || isSaving}
                maxLength="200"
                required
              />
            </label>
            <label className="full-width-field">
              Hospital Address
              <input
                name="address"
                value={form.address}
                onChange={updateField}
                disabled={!isAdmin || isSaving}
                maxLength="200"
                required
              />
            </label>
            <label>
              City
              <input
                name="city"
                value={form.city}
                onChange={updateField}
                disabled={!isAdmin || isSaving}
                maxLength="100"
                required
              />
            </label>
            <label>
              State
              <input
                name="state"
                value={form.state}
                onChange={updateField}
                disabled={!isAdmin || isSaving}
                maxLength="100"
                required
              />
            </label>
            <label>
              PIN Code
              <input
                name="pin"
                value={form.pin}
                onChange={updateField}
                disabled={!isAdmin || isSaving}
                maxLength="20"
                required
              />
            </label>
            <label>
              GSTIN
              <input
                name="gstin"
                value={form.gstin}
                onChange={updateField}
                disabled={!isAdmin || isSaving}
                maxLength="100"
                required
              />
            </label>
            <label>
              Hospital Phone
              <input
                name="phone"
                value={form.phone}
                onChange={updateField}
                disabled={!isAdmin || isSaving}
                maxLength="50"
                required
              />
            </label>
            <label>
              Hospital Email
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                disabled={!isAdmin || isSaving}
                maxLength="100"
                required
              />
            </label>
            <label>
              Tax Rate (%)
              <input
                name="tax_rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.tax_rate}
                onChange={updateField}
                disabled={!isAdmin || isSaving}
                required
              />
            </label>
          </div>

          {operationError && <p className="form-error" role="alert">{operationError}</p>}
          {successMessage && <p className="form-success" role="status" style={{ color: 'var(--color-primary-dark, #1b6e4e)', fontWeight: 'bold' }}>{successMessage}</p>}

          {isAdmin && (
            <div className="form-actions" style={{ marginTop: '20px' }}>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Saving…
                  </>
                ) : 'Save Settings'}
              </Button>
            </div>
          )}
        </form>
      </section>
    </div>
  )
}

export default Settings
