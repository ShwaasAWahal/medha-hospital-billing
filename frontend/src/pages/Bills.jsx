import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Modal from '../components/Modal.jsx'
import { ErrorState, LoadingState } from '../components/PageState.jsx'
import Pagination from '../components/Pagination.jsx'
import PrintableInvoice from '../components/PrintableInvoice.jsx'
import { getApiErrorMessage } from '../services/api.js'
import {
  deleteBill,
  getBill,
  getBills,
  updateBill,
} from '../services/billService.js'
import { getPatients } from '../services/patientService.js'
import { getSettings } from '../services/settingService.js'

const PAGE_SIZE = 8
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
})
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function localDateValue(value) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function effectiveTaxRate(bill) {
  const taxableAmount = Number(bill.subtotal) - Number(bill.discount)
  if (taxableAmount <= 0) return 0
  return Math.round((Number(bill.tax) / taxableAmount) * 10000) / 100
}

function BillEditForm({ bill, patients, isSaving, error, onCancel, onSubmit }) {
  const [patientId, setPatientId] = useState(String(bill.patient_id))
  
  const initialPercent = useMemo(() => {
    const sub = Number(bill.subtotal) || 0
    const disc = Number(bill.discount) || 0
    if (sub <= 0) return 0
    return Math.round((disc / sub) * 10000) / 100
  }, [bill.subtotal, bill.discount])

  const [discount, setDiscount] = useState(String(initialPercent))
  const [paymentMode, setPaymentMode] = useState(bill.payment_mode)
  const paymentModes = ['Cash', 'Card', 'UPI']

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      patient_id: Number(patientId),
      discount: Number(discount) || 0,
      payment_mode: paymentMode,
    })
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} aria-busy={isSaving}>
      <label>
        Patient
        <select value={patientId} onChange={(event) => setPatientId(event.target.value)} disabled={isSaving} required>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.patient_code} — {patient.full_name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Discount (%)
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
            disabled={isSaving}
            required
          />
        </label>
        <label>
          Payment mode
          <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)} disabled={isSaving} required>
            {!paymentModes.includes(paymentMode) && <option value={paymentMode}>{paymentMode}</option>}
            {paymentModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
        </label>
      </div>
      <p className="form-note">Service items and calculated totals remain unchanged except for discount-based recalculation.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </form>
  )
}

function Bills() {
  const { employee } = useOutletContext()
  const isAdmin = employee?.role === 'Admin'
  const [bills, setBills] = useState([])
  const [patients, setPatients] = useState([])
  const [hospitalSettings, setHospitalSettings] = useState(null)
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('date-desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [viewedBill, setViewedBill] = useState(null)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const [editingBill, setEditingBill] = useState(null)
  const [billToDelete, setBillToDelete] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [operationError, setOperationError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [billData, patientData, settingsData] = await Promise.all([
        getBills(),
        getPatients(),
        getSettings(),
      ])
      setBills(billData)
      setPatients(patientData)
      setHospitalSettings(settingsData)
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load bills or settings.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const patientMap = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  )

  const filteredBills = useMemo(() => {
    const invoiceQuery = invoiceSearch.trim().toLowerCase()
    const patientQuery = patientSearch.trim().toLowerCase()
    const result = bills.filter((bill) => {
      const patient = patientMap.get(bill.patient_id)
      const matchesInvoice = !invoiceQuery
        || bill.invoice_number.toLowerCase().includes(invoiceQuery)
      const matchesPatient = !patientQuery || [
        patient?.full_name,
        patient?.patient_code,
        patient?.phone,
      ].some((value) => value?.toLowerCase().includes(patientQuery))
      const matchesDate = !dateFilter || localDateValue(bill.created_at) === dateFilter
      return matchesInvoice && matchesPatient && matchesDate
    })

    return result.sort((first, second) => {
      if (sortOrder === 'date-asc') {
        return new Date(first.created_at) - new Date(second.created_at)
      }
      if (sortOrder === 'invoice-asc') {
        return first.invoice_number.localeCompare(second.invoice_number, undefined, { numeric: true })
      }
      if (sortOrder === 'invoice-desc') {
        return second.invoice_number.localeCompare(first.invoice_number, undefined, { numeric: true })
      }
      if (sortOrder === 'total-asc') {
        return Number(first.grand_total) - Number(second.grand_total)
      }
      if (sortOrder === 'total-desc') {
        return Number(second.grand_total) - Number(first.grand_total)
      }
      return new Date(second.created_at) - new Date(first.created_at)
    })
  }, [bills, dateFilter, invoiceSearch, patientMap, patientSearch, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const visibleBills = filteredBills.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  function updateFilter(setter, value) {
    setter(value)
    setCurrentPage(1)
  }

  async function openBill(billId) {
    setIsViewOpen(true)
    setIsViewLoading(true)
    setViewedBill(null)
    setOperationError('')
    try {
      setViewedBill(await getBill(billId))
    } catch (error) {
      setOperationError(getApiErrorMessage(error, 'Unable to load bill.'))
    } finally {
      setIsViewLoading(false)
    }
  }

  async function saveBill(values) {
    setIsSaving(true)
    setOperationError('')
    try {
      await updateBill(editingBill.id, values)
      setEditingBill(null)
      setCurrentPage(1)
      await loadData()
    } catch (error) {
      setOperationError(getApiErrorMessage(error, 'Unable to update bill.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function confirmDelete() {
    setIsDeleting(true)
    setOperationError('')
    try {
      await deleteBill(billToDelete.id)
      setBillToDelete(null)
      setCurrentPage(1)
      await loadData()
    } catch (error) {
      setOperationError(getApiErrorMessage(error, 'Unable to delete bill.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <header className="page-heading heading-row">
        <div>
          <h1>Bills</h1>
          <p>Review invoices and payment details.</p>
        </div>
        <Link to="/bills/new" className="button button-primary">Create bill</Link>
      </header>
      <section className="panel">
        <div className="bill-filters">
          <label>
            Search invoice
            <input
              type="search"
              value={invoiceSearch}
              onChange={(event) => updateFilter(setInvoiceSearch, event.target.value)}
              placeholder="Invoice number"
            />
          </label>
          <label>
            Search patient
            <input
              type="search"
              value={patientSearch}
              onChange={(event) => updateFilter(setPatientSearch, event.target.value)}
              placeholder="Name, code, or phone"
            />
          </label>
          <label>
            Bill date
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => updateFilter(setDateFilter, event.target.value)}
            />
          </label>
          <label>
            Sort by
            <select value={sortOrder} onChange={(event) => updateFilter(setSortOrder, event.target.value)}>
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="invoice-asc">Invoice ascending</option>
              <option value="invoice-desc">Invoice descending</option>
              <option value="total-desc">Total: high to low</option>
              <option value="total-asc">Total: low to high</option>
            </select>
          </label>
        </div>

        {isLoading ? (
          <LoadingState message="Loading bills…" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={loadData} />
        ) : (
          <>
            <div className="table-meta">
              <span>{filteredBills.length} bills</span>
              {(invoiceSearch || patientSearch || dateFilter) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setInvoiceSearch('')
                    setPatientSearch('')
                    setDateFilter('')
                    setCurrentPage(1)
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
            <div className="table-wrap">
              <table className="bills-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Patient</th>
                    <th>Phone</th>
                    <th>Date</th>
                    <th>Payment</th>
                    <th className="numeric">Total</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBills.length === 0 ? (
                    <tr><td colSpan="7" className="empty-state">No bills found.</td></tr>
                  ) : visibleBills.map((bill) => {
                    const patient = patientMap.get(bill.patient_id)
                    return (
                      <tr key={bill.id}>
                        <td><strong>{bill.invoice_number}</strong></td>
                        <td>
                          <span className="table-primary">{patient?.full_name || `Patient #${bill.patient_id}`}</span>
                          {patient?.patient_code && <small>{patient.patient_code}</small>}
                        </td>
                        <td>{patient?.phone || '—'}</td>
                        <td>{dateFormatter.format(new Date(bill.created_at))}</td>
                        <td>{bill.payment_mode}</td>
                        <td className="numeric"><strong>{currencyFormatter.format(Number(bill.grand_total))}</strong></td>
                        <td>
                          <div className="table-actions">
                            <Button variant="ghost" onClick={() => openBill(bill.id)}>View</Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setOperationError('')
                                setEditingBill(bill)
                              }}
                            >
                              Edit
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="danger-ghost"
                                onClick={() => {
                                  setOperationError('')
                                  setBillToDelete(bill)
                                }}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              label="Bill table pagination"
            />
          </>
        )}
      </section>

      <Modal
        isOpen={isViewOpen}
        title="Bill details"
        onClose={() => setIsViewOpen(false)}
        className="modal-wide"
      >
        {isViewLoading ? (
          <LoadingState message="Loading bill…" />
        ) : operationError ? (
          <p className="form-error" role="alert">{operationError}</p>
        ) : viewedBill && (
          <PrintableInvoice
            invoiceNumber={viewedBill.invoice_number}
            createdAt={viewedBill.created_at}
            patient={patientMap.get(viewedBill.patient_id)}
            items={viewedBill.items}
            subtotal={Number(viewedBill.subtotal)}
            discount={Number(viewedBill.discount)}
            tax={Number(viewedBill.tax)}
            taxRate={effectiveTaxRate(viewedBill)}
            grandTotal={Number(viewedBill.grand_total)}
            paymentMode={viewedBill.payment_mode}
            canPrint
            onPrint={() => window.print()}
            employeeName={viewedBill?.employee?.full_name}
            hospitalSettings={hospitalSettings}
          />
        )}
      </Modal>

      <Modal
        isOpen={Boolean(editingBill)}
        title={`Edit ${editingBill?.invoice_number || 'bill'}`}
        onClose={() => {
          if (!isSaving) setEditingBill(null)
        }}
      >
        {editingBill && (
          <BillEditForm
            key={editingBill.id}
            bill={editingBill}
            patients={patients}
            isSaving={isSaving}
            error={operationError}
            onCancel={() => setEditingBill(null)}
            onSubmit={saveBill}
          />
        )}
      </Modal>

      <Modal
        isOpen={Boolean(billToDelete)}
        title="Delete bill"
        onClose={() => {
          if (!isDeleting) setBillToDelete(null)
        }}
      >
        <div className="confirmation-content">
          <p>Delete bill <strong>{billToDelete?.invoice_number}</strong>? This action cannot be undone.</p>
          {operationError && <p className="form-error" role="alert">{operationError}</p>}
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setBillToDelete(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isDeleting}>{isDeleting ? 'Deleting…' : 'Delete bill'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Bills
