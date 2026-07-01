import Button from './Button.jsx'

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
})
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const hospital = {
  name: import.meta.env.VITE_HOSPITAL_NAME || 'Your Hospital Name',
  address: import.meta.env.VITE_HOSPITAL_ADDRESS || 'Hospital address, City, State - PIN',
  phone: import.meta.env.VITE_HOSPITAL_PHONE || '+91 XXXXX XXXXX',
  email: import.meta.env.VITE_HOSPITAL_EMAIL || 'billing@hospital.example',
  gstin: import.meta.env.VITE_HOSPITAL_GSTIN || 'GSTIN placeholder',
}

function PrintableInvoice({
  invoiceNumber,
  createdAt,
  patient,
  items,
  subtotal,
  discount,
  tax,
  taxRate,
  grandTotal,
  paymentMode,
  canPrint,
  onPrint,
}) {
  return (
    <div className="printable-invoice">
      <div className="invoice-toolbar no-print">
        <span>{canPrint ? 'Invoice ready to print' : 'Save the bill to enable printing'}</span>
        <Button onClick={onPrint} disabled={!canPrint}>Print invoice</Button>
      </div>
      <article className="invoice-sheet" aria-label="Printable hospital invoice">
        <header className="invoice-header">
          <div className="hospital-identity">
            <div className="invoice-logo-placeholder" aria-label="Hospital logo placeholder">LOGO</div>
            <div>
              <h2>{hospital.name}</h2>
              <p>{hospital.address}</p>
              <p>{hospital.phone} | {hospital.email}</p>
              <p>{hospital.gstin}</p>
            </div>
          </div>
          <div className="invoice-title">
            <span>TAX INVOICE</span>
            <strong>{invoiceNumber || 'DRAFT'}</strong>
          </div>
        </header>

        <section className="invoice-information">
          <div>
            <small>Patient information</small>
            <strong>{patient?.full_name || 'Select a patient'}</strong>
            <span>Patient code: {patient?.patient_code || '—'}</span>
            <span>
              {patient ? `${patient.gender}, ${patient.age} years` : 'Patient details unavailable'}
            </span>
            <span>{patient?.phone || 'Phone not provided'}</span>
            {patient?.address && <span>{patient.address}</span>}
          </div>
          <div className="invoice-metadata">
            <span><small>Invoice number</small><strong>{invoiceNumber || 'Draft'}</strong></span>
            <span><small>Invoice date</small><strong>{dateFormatter.format(new Date(createdAt))}</strong></span>
            <span><small>Payment mode</small><strong>{paymentMode || 'Not selected'}</strong></span>
          </div>
        </section>

        <div className="invoice-items-wrap">
          <table className="invoice-items">
            <thead>
              <tr>
                <th>#</th>
                <th>Service description</th>
                <th className="numeric">Quantity</th>
                <th className="numeric">Unit price</th>
                <th className="numeric">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.service_name || `Service ${index + 1}`}</td>
                  <td className="numeric">{item.quantity || 0}</td>
                  <td className="numeric">{currencyFormatter.format(Number(item.unit_price) || 0)}</td>
                  <td className="numeric">{currencyFormatter.format(Number(item.total) || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="invoice-summary">
          <div className="invoice-note">
            <strong>Thank you for choosing {hospital.name}.</strong>
            <span>This is a computer-generated invoice.</span>
          </div>
          <dl>
            <div><dt>Subtotal</dt><dd>{currencyFormatter.format(subtotal)}</dd></div>
            <div><dt>Discount</dt><dd>&minus; {currencyFormatter.format(discount)}</dd></div>
            <div><dt>Tax ({taxRate}%)</dt><dd>{currencyFormatter.format(tax)}</dd></div>
            <div className="invoice-grand-total"><dt>Grand total</dt><dd>{currencyFormatter.format(grandTotal)}</dd></div>
          </dl>
        </section>

        <footer className="invoice-footer">
          <span>Authorized billing document</span>
          <span>For queries: {hospital.phone}</span>
        </footer>
      </article>
    </div>
  )
}

export default PrintableInvoice
