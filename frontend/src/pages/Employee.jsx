import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Modal from '../components/Modal.jsx'
import { ErrorState, LoadingState } from '../components/PageState.jsx'
import Pagination from '../components/Pagination.jsx'
import EmployeeSearch from '../components/EmployeeSearch.jsx'
import { getApiErrorMessage } from '../services/api.js'
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  updateEmployee,
} from '../services/employeeService.js'

const PAGE_SIZE = 8

function EmployeeForm({ initialEmployee, isSaving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    username: initialEmployee?.username ?? '',
    password: '',
    full_name: initialEmployee?.full_name ?? '',
    role: initialEmployee?.role ?? '',
  })

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const payload = { ...form }
    if (initialEmployee && !payload.password) {
      delete payload.password
    }
    onSubmit(payload)
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} aria-busy={isSaving}>
      <div className="form-grid">
        <label>
          Username
          <input
            name="username"
            value={form.username}
            onChange={updateField}
            minLength="3"
            maxLength="100"
            disabled={isSaving}
            required
          />
        </label>
        <label>
          Full name
          <input
            name="full_name"
            value={form.full_name}
            onChange={updateField}
            minLength="1"
            maxLength="150"
            disabled={isSaving}
            required
          />
        </label>
        <label>
          Role
          <select
            name="role"
            value={form.role}
            onChange={updateField}
            disabled={isSaving}
            required
          >
            <option value="" disabled>Select role</option>
            <option value="Admin">Admin</option>
            <option value="Receptionist">Receptionist</option>
          </select>
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={updateField}
            minLength="8"
            maxLength="72"
            disabled={isSaving}
            required={!initialEmployee}
            placeholder={initialEmployee ? 'Leave blank to keep current' : ''}
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
          ) : 'Save employee'}
        </Button>
      </div>
    </form>
  )
}

function Employees() {
  const { employee: currentUser } = useOutletContext()

  const [employees, setEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [employeeToDelete, setEmployeeToDelete] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [operationError, setOperationError] = useState('')

  const loadEmployees = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'Admin') return
    setIsLoading(true)
    setLoadError('')
    try {
      setEmployees(await getEmployees())
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load employees.'))
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser && currentUser.role === 'Admin') {
      loadEmployees()
    }
  }, [loadEmployees, currentUser])

  const filteredEmployees = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return employees
    return employees.filter((employee) => (
      employee.username.toLowerCase().includes(query)
      || employee.full_name.toLowerCase().includes(query)
    ))
  }, [employees, searchTerm])

  if (!currentUser || currentUser.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />
  }

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const visibleEmployees = filteredEmployees.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  function openCreateModal() {
    setEditingEmployee(null)
    setOperationError('')
    setIsFormOpen(true)
  }

  function openEditModal(employee) {
    setEditingEmployee(employee)
    setOperationError('')
    setIsFormOpen(true)
  }

  function closeFormModal() {
    if (!isSaving) setIsFormOpen(false)
  }

  async function saveEmployee(values) {
    setIsSaving(true)
    setOperationError('')
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, values)
      } else {
        await createEmployee(values)
      }
      setIsFormOpen(false)
      setCurrentPage(1)
      await loadEmployees()
    } catch (error) {
      setOperationError(getApiErrorMessage(error, 'Unable to save employee.'))
    } finally {
      setIsSaving(false)
    }
  }

  function requestDelete(employee) {
    setEmployeeToDelete(employee)
    setOperationError('')
  }

  async function confirmDelete() {
    setIsDeleting(true)
    setOperationError('')
    try {
      await deleteEmployee(employeeToDelete.id)
      setEmployeeToDelete(null)
      setCurrentPage(1)
      await loadEmployees()
    } catch (error) {
      setOperationError(getApiErrorMessage(error, 'Unable to delete employee.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <header className="page-heading heading-row">
        <div>
          <h1>Employees</h1>
          <p>View and manage employee accounts.</p>
        </div>
        <Button onClick={openCreateModal}>Add employee</Button>
      </header>
      <section className="panel">
        <div className="toolbar">
          <EmployeeSearch
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search by username or full name"
          />
          <span className="record-count">{filteredEmployees.length} employees</span>
        </div>
        {isLoading ? (
          <LoadingState message="Loading employees…" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={loadEmployees} />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Created At</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-state">No employees found.</td>
                    </tr>
                  ) : visibleEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td><strong>{employee.username}</strong></td>
                      <td>{employee.full_name}</td>
                      <td>{employee.role}</td>
                      <td>{new Date(employee.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="table-actions">
                          <Button variant="ghost" onClick={() => openEditModal(employee)}>Edit</Button>
                          <Button variant="danger-ghost" onClick={() => requestDelete(employee)}>Delete</Button>
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
              label="Employee table pagination"
            />
          </>
        )}
      </section>

      <Modal
        isOpen={isFormOpen}
        title={editingEmployee ? 'Edit employee' : 'Create employee'}
        onClose={closeFormModal}
      >
        <EmployeeForm
          key={editingEmployee?.id ?? 'new'}
          initialEmployee={editingEmployee}
          isSaving={isSaving}
          error={operationError}
          onCancel={closeFormModal}
          onSubmit={saveEmployee}
        />
      </Modal>

      <Modal
        isOpen={Boolean(employeeToDelete)}
        title="Delete employee"
        onClose={() => {
          if (!isDeleting) setEmployeeToDelete(null)
        }}
      >
        <div className="confirmation-content">
          <p>
            Delete employee <strong>{employeeToDelete?.full_name}</strong>? This action cannot be undone.
          </p>
          {operationError && <p className="form-error" role="alert">{operationError}</p>}
          <div className="form-actions">
            <Button
              variant="secondary"
              onClick={() => setEmployeeToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete employee'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Employees

