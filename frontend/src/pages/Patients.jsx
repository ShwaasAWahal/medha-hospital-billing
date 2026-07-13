import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Modal from '../components/Modal.jsx'
import { ErrorState, LoadingState } from '../components/PageState.jsx'
import Pagination from '../components/Pagination.jsx'
import PatientSearch from '../components/PatientSearch.jsx'
import { getApiErrorMessage } from '../services/api.js'
import {
  createPatient,
  deletePatient,
  getPatients,
  updatePatient,
} from '../services/patientService.js'

const PAGE_SIZE = 8

function PatientForm({ initialPatient, isSaving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    patient_code: initialPatient?.patient_code ?? '',
    full_name: initialPatient?.full_name ?? '',
    gender: initialPatient?.gender ?? '',
    age: initialPatient?.age ?? '',
    phone: initialPatient?.phone ?? '',
    address: initialPatient?.address ?? '',
  })

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const payload = {
      ...form,
      age: Number(form.age),
      phone: form.phone || null,
      address: form.address || null,
    }
    if (!initialPatient) {
      delete payload.patient_code
    }
    onSubmit(payload)
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} aria-busy={isSaving}>
      <div className="form-grid">
        {initialPatient && (
          <label>
            Patient code
            <input
              name="patient_code"
              value={form.patient_code}
              disabled
              required
            />
          </label>
        )}
        <label>
          Full name
          <input
            name="full_name"
            value={form.full_name}
            onChange={updateField}
            maxLength="150"
            disabled={isSaving}
            required
          />
        </label>
        <label>
          Gender
          <select
            name="gender"
            value={form.gender}
            onChange={updateField}
            disabled={isSaving}
            required
          >
            <option value="" disabled>Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label>
          Age
          <input
            name="age"
            type="number"
            min="0"
            max="150"
            value={form.age}
            onChange={updateField}
            disabled={isSaving}
            required
          />
        </label>
        <label>
          Phone
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={updateField}
            maxLength="20"
            disabled={isSaving}
          />
        </label>
        <label className="full-width-field">
          Address
          <textarea
            name="address"
            value={form.address}
            onChange={updateField}
            rows="3"
            disabled={isSaving}
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
          ) : 'Save patient'}
        </Button>
      </div>
    </form>
  )
}

function Patients() {
  const navigate = useNavigate()
  const location = useLocation()
  const { employee } = useOutletContext()
  const isAdmin = employee?.role === 'Admin'
  const [patients, setPatients] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (location.state?.openRegister) {
      setIsFormOpen(true)
      window.history.replaceState({}, document.title)
    }
  }, [location])
  const [loadError, setLoadError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState(null)
  const [patientToDelete, setPatientToDelete] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [operationError, setOperationError] = useState('')

  const loadPatients = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      setPatients(await getPatients())
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load patients.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  const filteredPatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return patients
    return patients.filter((patient) => (
      patient.patient_code.toLowerCase().includes(query)
      || patient.full_name.toLowerCase().includes(query)
      || patient.phone?.toLowerCase().includes(query)
    ))
  }, [patients, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const visiblePatients = filteredPatients.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  function openCreateModal() {
    setEditingPatient(null)
    setOperationError('')
    setIsFormOpen(true)
  }

  function openEditModal(patient) {
    setEditingPatient(patient)
    setOperationError('')
    setIsFormOpen(true)
  }

  function closeFormModal() {
    if (!isSaving) setIsFormOpen(false)
  }

  async function savePatient(values) {
    setIsSaving(true)
    setOperationError('')
    try {
      if (editingPatient) {
        await updatePatient(editingPatient.id, values)
        setIsFormOpen(false)
        setCurrentPage(1)
        await loadPatients()
      } else {
        const newPatient = await createPatient(values)
        setIsFormOpen(false)
        navigate('/bills/new', { state: { selectedPatient: newPatient } })
      }
    } catch (error) {
      setOperationError(getApiErrorMessage(error, 'Unable to save patient.'))
    } finally {
      setIsSaving(false)
    }
  }

  function requestDelete(patient) {
    setPatientToDelete(patient)
    setOperationError('')
  }

  async function confirmDelete() {
    setIsDeleting(true)
    setOperationError('')
    try {
      await deletePatient(patientToDelete.id)
      setPatientToDelete(null)
      setCurrentPage(1)
      await loadPatients()
    } catch (error) {
      setOperationError(getApiErrorMessage(error, 'Unable to delete patient.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <header className="page-heading heading-row">
        <div>
          <h1>Patients</h1>
          <p>View and manage patient records.</p>
        </div>
        <Button onClick={openCreateModal}>Add patient</Button>
      </header>
      <section className="panel">
        <div className="toolbar">
          <PatientSearch
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search by code, name, or phone"
          />
          <span className="record-count">{filteredPatients.length} patients</span>
        </div>
        {isLoading ? (
          <LoadingState message="Loading patients…" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={loadPatients} />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Patient code</th>
                    <th>Name</th>
                    <th>Gender</th>
                    <th>Age</th>
                    <th>Phone</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePatients.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">No patients found.</td>
                    </tr>
                  ) : visiblePatients.map((patient) => (
                    <tr key={patient.id}>
                      <td><strong>{patient.patient_code}</strong></td>
                      <td>{patient.full_name}</td>
                      <td>{patient.gender}</td>
                      <td>{patient.age}</td>
                      <td>{patient.phone || '—'}</td>
                      <td>
                        <div className="table-actions">
                          <Button variant="ghost" onClick={() => openEditModal(patient)}>Edit</Button>
                          {isAdmin && (
                            <Button variant="danger-ghost" onClick={() => requestDelete(patient)}>Delete</Button>
                          )}
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
              label="Patient table pagination"
            />
          </>
        )}
      </section>

      <Modal
        isOpen={isFormOpen}
        title={editingPatient ? 'Edit patient' : 'Create patient'}
        onClose={closeFormModal}
      >
        <PatientForm
          key={editingPatient?.id ?? 'new'}
          initialPatient={editingPatient}
          isSaving={isSaving}
          error={operationError}
          onCancel={closeFormModal}
          onSubmit={savePatient}
        />
      </Modal>

      <Modal
        isOpen={Boolean(patientToDelete)}
        title="Delete patient"
        onClose={() => {
          if (!isDeleting) setPatientToDelete(null)
        }}
      >
        <div className="confirmation-content">
          <p>
            Delete <strong>{patientToDelete?.full_name}</strong>? This action cannot be undone.
          </p>
          {operationError && <p className="form-error" role="alert">{operationError}</p>}
          <div className="form-actions">
            <Button
              variant="secondary"
              onClick={() => setPatientToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete patient'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Patients
