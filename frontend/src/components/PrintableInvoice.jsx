import Button from './Button.jsx'

function formatJustDate(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const hospital = {
  name: import.meta.env.VITE_HOSPITAL_NAME || 'Your Hospital Name',
  address: import.meta.env.VITE_HOSPITAL_ADDRESS || 'Hospital Address, City, State - PIN',
  phone: import.meta.env.VITE_HOSPITAL_PHONE || '+91 XXXXX XXXXX',
  email: import.meta.env.VITE_HOSPITAL_EMAIL || 'billing@hospital.example',
  gstin: import.meta.env.VITE_HOSPITAL_GSTIN || 'GSTIN Placeholder',
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
  const netAmount = subtotal - discount

  return (
    <div className="printable-invoice">
      <style>{`
        .legacy-print-layout {
          min-height: auto !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          color: #000 !important;
          background: #fff !important;
          font-family: 'Courier New', Courier, monospace !important;
          padding: 10px 15px !important;
          line-height: 1.25 !important;
          font-size: 13px !important;
        }

        @media print {
          .invoice-sheet.legacy-print-layout {
            min-height: auto !important;
            height: auto !important;
            padding: 5mm 10mm !important;
          }
        }
        
        .invoice-header-legacy {
          border-bottom: 2px solid #000 !important;
          padding-bottom: 6px !important;
          margin-bottom: 8px !important;
        }
        
        .hospital-info-legacy h2 {
          margin: 0 0 3px !important;
          font-size: 17px !important;
          font-weight: 700 !important;
          letter-spacing: 0.5px !important;
          text-transform: uppercase !important;
          color: #000 !important;
        }
        
        .hospital-address-legacy {
          margin: 0 0 2px !important;
          font-size: 11px !important;
          color: #000 !important;
        }
        
        .hospital-contact-legacy {
          margin: 0 !important;
          font-size: 11px !important;
          color: #000 !important;
        }
        
        .metadata-table-legacy {
          margin-bottom: 8px !important;
          border-bottom: 1.5px solid #000 !important;
          padding-bottom: 6px !important;
        }
        
        .info-table-grid {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        
        .info-table-grid td {
          padding: 2px 4px !important;
          vertical-align: top !important;
          font-size: 11px !important;
          color: #000 !important;
          border: none !important;
        }
        
        .info-table-grid td.lbl {
          font-weight: bold !important;
          width: 15% !important;
        }
        
        .info-table-grid td.val {
          width: 35% !important;
        }
        
        .items-table-legacy {
          margin-bottom: 8px !important;
        }
        
        .items-grid-legacy {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        
        .items-grid-legacy th {
          border-top: 1.5px solid #000 !important;
          border-bottom: 1.5px solid #000 !important;
          padding: 4px 6px !important;
          font-weight: bold !important;
          text-align: left !important;
          font-size: 11px !important;
          color: #000 !important;
        }
        
        .items-grid-legacy td {
          padding: 4px 6px !important;
          font-size: 11px !important;
          vertical-align: top !important;
          color: #000 !important;
          border: none !important;
        }
        
        .items-grid-legacy th.numeric,
        .items-grid-legacy td.numeric {
          text-align: right !important;
        }
        
        .desc-col {
          width: 55% !important;
        }
        
        .rate-col {
          width: 15% !important;
        }
        
        .qty-col {
          width: 10% !important;
        }
        
        .amount-col {
          width: 20% !important;
        }
        
        .totals-row-legacy td {
          padding: 3px 6px !important;
          border: none !important;
        }
        
        .totals-row-legacy .totals-label {
          font-weight: bold !important;
          text-align: left !important;
          padding-left: 20px !important;
          white-space: nowrap !important;
        }
        
        .totals-row-legacy .totals-value {
          text-align: right !important;
          font-weight: bold !important;
        }
        
        .grand-total-row-legacy td {
          border-top: 1px solid #000 !important;
          border-bottom: 1.5px solid #000 !important;
          padding-top: 5px !important;
          padding-bottom: 5px !important;
        }
        
        .footer-legacy {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-end !important;
          margin-top: 12px !important;
          padding-bottom: 5px !important;
        }
        
        .footer-left {
          flex: 1 !important;
        }
        
        .payment-mode-legacy {
          font-size: 12px !important;
          border: 1px solid #000 !important;
          padding: 4px 10px !important;
          display: inline-block !important;
          font-weight: bold !important;
          color: #000 !important;
        }
      `}</style>

      <div className="invoice-toolbar no-print">
        <span>{canPrint ? 'Invoice ready to print' : 'Save the bill to enable printing'}</span>
        <Button onClick={onPrint} disabled={!canPrint}>Print invoice</Button>
      </div>

      <article className="invoice-sheet legacy-print-layout" aria-label="Printable hospital invoice">
        <header className="invoice-header-legacy">
          <div className="hospital-info-legacy">
            <h2>{hospital.name}</h2>
            <p className="hospital-address-legacy">{hospital.address}</p>
            <p className="hospital-contact-legacy">Phone: {hospital.phone} | Email: {hospital.email} | GSTIN: {hospital.gstin}</p>
          </div>
        </header>

        <section className="metadata-table-legacy">
          <table className="info-table-grid">
            <tbody>
              <tr>
                <td className="lbl">Receipt No</td>
                <td className="val">: {invoiceNumber || 'DRAFT'}</td>
                <td className="lbl">Date</td>
                <td className="val">: {formatJustDate(createdAt)}</td>
              </tr>
              <tr>
                <td className="lbl">Name</td>
                <td className="val">: {patient?.full_name || '—'}</td>
                <td className="lbl">Age/Sex</td>
                <td className="val">: {patient ? `${patient.age} Yrs / ${patient.gender === 'Male' ? 'M' : patient.gender === 'Female' ? 'F' : patient.gender}` : '—'}</td>
              </tr>
              <tr>
                <td className="lbl">Reg. No</td>
                <td className="val">: {patient?.patient_code || '—'}</td>
                {/* <td className="lbl">Bill No</td>
                <td className="val">: {invoiceNumber || 'DRAFT'}</td> */}
              </tr>
              <tr>
                {/* <td className="lbl">UHID</td>
                <td className="val">: {patient?.patient_code || '—'}</td> */}
                <td className="lbl"></td>
                <td className="val"></td>
              </tr>
              <tr>
                <td className="lbl">Address</td>
                <td className="val" colSpan="3">: {patient?.address || '—'}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="items-table-legacy">
          <table className="items-grid-legacy">
            <thead>
              <tr>
                <th className="desc-col">Description</th>
                <th className="rate-col numeric">Rate</th>
                <th className="qty-col numeric">Qty</th>
                <th className="amount-col numeric">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="desc-col">{item.service_name}</td>
                  <td className="rate-col numeric">{Number(item.unit_price).toFixed(2)}</td>
                  <td className="qty-col numeric">{item.quantity}</td>
                  <td className="amount-col numeric">{Number(item.total).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="totals-row-legacy">
                <td colSpan="1" className="blank-cell"></td>
                <td colSpan="2" className="totals-label">Total Amount (Rs.)</td>
                <td className="totals-value numeric">{Number(subtotal).toFixed(2)}</td>
              </tr>
              {Number(discount) > 0 && (
                <tr className="totals-row-legacy">
                  <td colSpan="1" className="blank-cell"></td>
                  <td colSpan="2" className="totals-label">Discount (Rs.)</td>
                  <td className="totals-value numeric">&minus; {Number(discount).toFixed(2)}</td>
                </tr>
              )}
              <tr className="totals-row-legacy">
                <td colSpan="1" className="blank-cell"></td>
                <td colSpan="2" className="totals-label">Net Amount (Rs.)</td>
                <td className="totals-value numeric">{Number(netAmount).toFixed(2)}</td>
              </tr>
              {Number(tax) > 0 && (
                <tr className="totals-row-legacy">
                  <td colSpan="1" className="blank-cell"></td>
                  <td colSpan="2" className="totals-label">Tax ({taxRate}%)</td>
                  <td className="totals-value numeric">{Number(tax).toFixed(2)}</td>
                </tr>
              )}
              <tr className="totals-row-legacy grand-total-row-legacy">
                <td colSpan="1" className="blank-cell"></td>
                <td colSpan="2" className="totals-label">Paid Amount (Rs.)</td>
                <td className="totals-value numeric">{Number(grandTotal).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer className="footer-legacy">
          <div className="footer-left">
            <div className="payment-mode-legacy">
              Mode of Payment: {paymentMode ? paymentMode.toUpperCase() : 'CASH'}
            </div>
          </div>
        </footer>
      </article>
    </div>
  )
}

export default PrintableInvoice
