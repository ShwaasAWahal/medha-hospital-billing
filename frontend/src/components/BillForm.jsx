import Button from './Button.jsx'
import PatientSearch from './PatientSearch.jsx'
import PrintableInvoice from './PrintableInvoice.jsx'

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
})

function BillForm({
  patientSearch,
  onPatientSearchChange,
  patientResults,
  selectedPatient,
  onSelectPatient,
  isPatientLoading,
  patientError,
  onRetryPatients,
  services,
  onServiceChange,
  onAddService,
  onRemoveService,
  discount,
  onDiscountChange,
  paymentMode,
  onPaymentModeChange,
  totals,
  taxRate,
  savedBill,
  isSaving,
  error,
  onSubmit,
  onPrint,
}) {
  const previewServices = savedBill
    ? savedBill.items.map((item) => ({
      id: item.id,
      service_name: item.service_name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      total: Number(item.total),
    }))
    : services.map((service, index) => ({
      ...service,
      total: totals.lineTotals[index],
    }))
  const previewTotals = savedBill ? {
    subtotal: Number(savedBill.subtotal),
    discount: Number(savedBill.discount),
    tax: Number(savedBill.tax),
    grandTotal: Number(savedBill.grand_total),
  } : totals

  return (
    <div className="bill-workspace">
      <form className="panel form-stack bill-editor" onSubmit={onSubmit} aria-busy={isSaving}>
        <section className="form-section">
          <h2>Patient</h2>
          {selectedPatient ? (
            <div className="selected-patient">
              <div>
                <strong>{selectedPatient.full_name}</strong>
                <span>{selectedPatient.patient_code} · {selectedPatient.phone || 'No phone'}</span>
              </div>
              <Button variant="ghost" onClick={() => onSelectPatient(null)}>Change</Button>
            </div>
          ) : (
            <div className="patient-picker">
              <PatientSearch
                value={patientSearch}
                onChange={onPatientSearchChange}
                placeholder="Search by code, name, or phone"
              />
              {isPatientLoading && (
                <span className="inline-status" role="status">
                  <span className="page-spinner" aria-hidden="true" /> Loading patients…
                </span>
              )}
              {patientError && (
                <div className="status-message error-message" role="alert">
                  <span>{patientError}</span>
                  <Button variant="secondary" onClick={onRetryPatients}>Try again</Button>
                </div>
              )}
              {patientSearch && !isPatientLoading && !patientError && (
                <div className="patient-results">
                  {patientResults.length ? patientResults.map((patient) => (
                    <button
                      type="button"
                      key={patient.id}
                      className="patient-result"
                      onClick={() => onSelectPatient(patient)}
                    >
                      <strong>{patient.full_name}</strong>
                      <span>{patient.patient_code} · {patient.phone || 'No phone'}</span>
                    </button>
                  )) : <p className="empty-state">No matching patients.</p>}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="form-section">
          <div className="section-heading">
            <h2>Services</h2>
            <Button variant="secondary" onClick={onAddService}>Add service</Button>
          </div>
          <div className="service-list">
            {services.map((service, index) => (
              <div className="service-entry" key={service.id}>
                <label>
                  Service name
                  <input
                    type="text"
                    value={service.service_name}
                    onChange={(event) => onServiceChange(service.id, 'service_name', event.target.value)}
                    placeholder="e.g. Consultation"
                    maxLength="200"
                    disabled={isSaving}
                    required
                  />
                </label>
                <label>
                  Quantity
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={service.quantity}
                    onChange={(event) => onServiceChange(service.id, 'quantity', event.target.value)}
                    disabled={isSaving}
                    required
                  />
                </label>
                <label>
                  Unit price
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={service.unit_price}
                    onChange={(event) => onServiceChange(service.id, 'unit_price', event.target.value)}
                    placeholder="0.00"
                    disabled={isSaving}
                    required
                  />
                </label>
                <div className="line-total">
                  <span>Total</span>
                  <strong>{currencyFormatter.format(totals.lineTotals[index])}</strong>
                </div>
                <Button
                  variant="danger-ghost"
                  onClick={() => onRemoveService(service.id)}
                  disabled={services.length === 1 || isSaving}
                  aria-label={`Remove service ${index + 1}`}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h2>Payment</h2>
          <div className="form-grid">
            <label>
              Discount
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={onDiscountChange}
                placeholder="0.00"
                disabled={isSaving}
              />
            </label>
            <label>
              Payment mode
              <select value={paymentMode} onChange={onPaymentModeChange} disabled={isSaving} required>
                <option value="" disabled>Select payment mode</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
              </select>
            </label>
          </div>
        </section>

        {error && <p className="form-error" role="alert">{error}</p>}
        {savedBill && (
          <p className="success-message" role="status">
            Bill {savedBill.invoice_number} saved successfully.
          </p>
        )}
        <div className="form-actions">
          <Button type="submit" disabled={isSaving || Boolean(savedBill)}>
            {isSaving ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Saving…
              </>
            ) : savedBill ? 'Bill saved' : 'Save bill'}
          </Button>
        </div>
      </form>

      <PrintableInvoice
        invoiceNumber={savedBill?.invoice_number}
        createdAt={savedBill?.created_at || new Date().toISOString()}
        patient={selectedPatient}
        items={previewServices}
        subtotal={previewTotals.subtotal}
        discount={previewTotals.discount}
        tax={previewTotals.tax}
        taxRate={taxRate}
        grandTotal={previewTotals.grandTotal}
        paymentMode={paymentMode}
        canPrint={Boolean(savedBill)}
        onPrint={onPrint}
      />
    </div>
  )
}

export default BillForm
