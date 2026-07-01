import { useCallback, useEffect, useMemo, useState } from 'react'
import BillForm from '../components/BillForm.jsx'
import { getApiErrorMessage } from '../services/api.js'
import { createBill } from '../services/billService.js'
import { getPatients } from '../services/patientService.js'

const configuredTaxRate = Number(import.meta.env.VITE_TAX_RATE_PERCENT ?? 18)
const TAX_RATE = Number.isFinite(configuredTaxRate) && configuredTaxRate >= 0
  ? configuredTaxRate
  : 18

let nextServiceId = 1

function createServiceRow() {
  return {
    id: `service-${nextServiceId++}`,
    service_name: '',
    quantity: '1',
    unit_price: '',
  }
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function NewBill() {
  const [patients, setPatients] = useState([])
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [isPatientLoading, setIsPatientLoading] = useState(true)
  const [patientError, setPatientError] = useState('')
  const [services, setServices] = useState(() => [createServiceRow()])
  const [discount, setDiscount] = useState('0')
  const [paymentMode, setPaymentMode] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedBill, setSavedBill] = useState(null)

  const loadPatients = useCallback(async () => {
    setIsPatientLoading(true)
    setPatientError('')
    try {
      setPatients(await getPatients())
    } catch (error) {
      setPatientError(getApiErrorMessage(error, 'Unable to load patients.'))
    } finally {
      setIsPatientLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  const patientResults = useMemo(() => {
    const query = patientSearch.trim().toLowerCase()
    if (!query) return []
    return patients.filter((patient) => (
      patient.patient_code.toLowerCase().includes(query)
      || patient.full_name.toLowerCase().includes(query)
      || patient.phone?.toLowerCase().includes(query)
    )).slice(0, 6)
  }, [patientSearch, patients])

  const totals = useMemo(() => {
    const lineTotals = services.map((service) => roundMoney(
      (Number(service.quantity) || 0) * (Number(service.unit_price) || 0),
    ))
    const subtotal = roundMoney(lineTotals.reduce((sum, total) => sum + total, 0))
    const discountAmount = roundMoney(Math.max(0, Number(discount) || 0))
    const taxableAmount = Math.max(0, subtotal - discountAmount)
    const tax = roundMoney(taxableAmount * TAX_RATE / 100)

    return {
      lineTotals,
      subtotal,
      discount: discountAmount,
      tax,
      grandTotal: roundMoney(taxableAmount + tax),
    }
  }, [discount, services])

  function markDraft() {
    setSavedBill(null)
    setSaveError('')
  }

  function selectPatient(patient) {
    setSelectedPatient(patient)
    setPatientSearch('')
    markDraft()
  }

  function changeService(serviceId, field, value) {
    setServices((current) => current.map((service) => (
      service.id === serviceId ? { ...service, [field]: value } : service
    )))
    markDraft()
  }

  function addService() {
    setServices((current) => [...current, createServiceRow()])
    markDraft()
  }

  function removeService(serviceId) {
    setServices((current) => current.filter((service) => service.id !== serviceId))
    markDraft()
  }

  function validateDraft() {
    if (!selectedPatient) return 'Select a patient.'
    if (services.some((service) => !service.service_name.trim())) {
      return 'Every service must have a name.'
    }
    if (services.some((service) => Number(service.quantity) <= 0)) {
      return 'Service quantity must be greater than zero.'
    }
    if (services.some((service) => service.unit_price === '' || Number(service.unit_price) < 0)) {
      return 'Service prices must be zero or greater.'
    }
    if (totals.discount > totals.subtotal) return 'Discount cannot exceed subtotal.'
    if (!paymentMode) return 'Select a payment mode.'
    return ''
  }

  async function saveBill(event) {
    event.preventDefault()
    const validationError = validateDraft()
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setIsSaving(true)
    setSaveError('')
    try {
      const bill = await createBill({
        patient_id: selectedPatient.id,
        discount: totals.discount,
        payment_mode: paymentMode,
        items: services.map((service) => ({
          service_name: service.service_name.trim(),
          quantity: Number(service.quantity),
          unit_price: Number(service.unit_price),
        })),
      })
      setSavedBill(bill)
    } catch (error) {
      setSaveError(getApiErrorMessage(error, 'Unable to save bill.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <header className="page-heading">
        <h1>New bill</h1>
        <p>Create a patient invoice and add billable services.</p>
      </header>
      <BillForm
        patientSearch={patientSearch}
        onPatientSearchChange={(event) => setPatientSearch(event.target.value)}
        patientResults={patientResults}
        selectedPatient={selectedPatient}
        onSelectPatient={selectPatient}
        isPatientLoading={isPatientLoading}
        patientError={patientError}
        onRetryPatients={loadPatients}
        services={services}
        onServiceChange={changeService}
        onAddService={addService}
        onRemoveService={removeService}
        discount={discount}
        onDiscountChange={(event) => {
          setDiscount(event.target.value)
          markDraft()
        }}
        paymentMode={paymentMode}
        onPaymentModeChange={(event) => {
          setPaymentMode(event.target.value)
          markDraft()
        }}
        totals={totals}
        taxRate={TAX_RATE}
        savedBill={savedBill}
        isSaving={isSaving}
        error={saveError}
        onSubmit={saveBill}
        onPrint={() => window.print()}
      />
    </div>
  )
}

export default NewBill
