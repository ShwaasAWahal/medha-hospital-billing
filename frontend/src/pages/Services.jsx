import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '../components/Button.jsx'
import Modal from '../components/Modal.jsx'
import { ErrorState, LoadingState } from '../components/PageState.jsx'
import Pagination from '../components/Pagination.jsx'
import { getApiErrorMessage } from '../services/api.js'
import {
  createService,
  deleteService,
  getServices,
  updateService,
} from '../services/serviceService.js'

const PAGE_SIZE = 8
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
})

function ServiceForm({ initialService, isSaving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    name: initialService?.name ?? '',
    price: initialService?.price ?? '',
  })

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      name: form.name.trim(),
      price: Number(form.price),
    })
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} aria-busy={isSaving}>
      <div className="form-grid">
        <label>
          Service name
          <input
            name="name"
            value={form.name}
            onChange={updateField}
            maxLength="200"
            disabled={isSaving}
            required
            placeholder="e.g. Blood Test"
          />
        </label>
        <label>
          Default price (₹)
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={updateField}
            disabled={isSaving}
            required
            placeholder="0.00"
          />
        </label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Saving…
            </>
          ) : 'Save service'}
        </Button>
      </div>
    </form>
  )
}

function Services() {
  const [services, setServices] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [serviceToDelete, setServiceToDelete] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [operationError, setOperationError] = useState('')

  const loadServices = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      setServices(await getServices())
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load services.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadServices()
  }, [loadServices])

  const filteredServices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return services
    return services.filter((service) =>
      service.name.toLowerCase().includes(query)
    )
  }, [searchTerm, services])

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const visibleServices = filteredServices.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  function openCreate() {
    setEditingService(null)
    setOperationError('')
    setIsFormOpen(true)
  }

  function openEdit(service) {
    setEditingService(service)
    setOperationError('')
    setIsFormOpen(true)
  }

  function openDelete(service) {
    setServiceToDelete(service)
    setOperationError('')
  }

  async function handleSave(formValues) {
    setIsSaving(true)
    setOperationError('')
    try {
      if (editingService) {
        await updateService(editingService.id, formValues)
      } else {
        await createService(formValues)
      }
      setIsFormOpen(false)
      setEditingService(null)
      await loadServices()
    } catch (error) {
      setOperationError(getApiErrorMessage(error, 'Unable to save service.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    setOperationError('')
    try {
      await deleteService(serviceToDelete.id)
      setServiceToDelete(null)
      setCurrentPage(1)
      await loadServices()
    } catch (error) {
      setOperationError(getApiErrorMessage(error, 'Unable to delete service.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <header className="page-heading heading-row">
        <div>
          <h1>Services</h1>
          <p>Manage list of available services and default pricing.</p>
        </div>
        <Button onClick={openCreate}>Create service</Button>
      </header>

      <section className="panel">
        <div className="table-search">
          <label>
            Search service
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search by name"
            />
          </label>
        </div>

        {isLoading ? (
          <LoadingState message="Loading services…" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={loadServices} />
        ) : (
          <>
            <div className="table-meta">
              <span>{filteredServices.length} services</span>
            </div>
            <div className="table-wrap">
              <table className="patients-table">
                <thead>
                  <tr>
                    <th>Service Name</th>
                    <th className="numeric">Price</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleServices.length === 0 ? (
                    <tr><td colSpan="3" className="empty-state">No services found.</td></tr>
                  ) : visibleServices.map((service) => (
                    <tr key={service.id}>
                      <td><strong>{service.name}</strong></td>
                      <td className="numeric">{currencyFormatter.format(Number(service.price))}</td>
                      <td>
                        <div className="table-actions">
                          <Button variant="ghost" onClick={() => openEdit(service)}>Edit</Button>
                          <Button variant="danger-ghost" onClick={() => openDelete(service)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              label="Service table pagination"
            />
          </>
        )}
      </section>

      <Modal
        isOpen={isFormOpen}
        title={editingService ? 'Edit service' : 'Create service'}
        onClose={() => {
          if (!isSaving) setIsFormOpen(false)
        }}
      >
        <ServiceForm
          initialService={editingService}
          isSaving={isSaving}
          error={operationError}
          onCancel={() => setIsFormOpen(false)}
          onSubmit={handleSave}
        />
      </Modal>

      <Modal
        isOpen={Boolean(serviceToDelete)}
        title="Delete service"
        onClose={() => {
          if (!isDeleting) setServiceToDelete(null)
        }}
      >
        <div className="confirmation-content">
          <p>Delete service <strong>{serviceToDelete?.name}</strong>? This action cannot be undone.</p>
          {operationError && <p className="form-error" role="alert">{operationError}</p>}
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setServiceToDelete(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting…' : 'Delete service'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Services
