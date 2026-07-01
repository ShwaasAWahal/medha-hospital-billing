function BillTable({ bills = [] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Patient</th>
            <th>Date</th>
            <th>Payment</th>
            <th className="numeric">Total</th>
          </tr>
        </thead>
        <tbody>
          {bills.length === 0 ? (
            <tr>
              <td colSpan="5" className="empty-state">No bills to display.</td>
            </tr>
          ) : bills.map((bill) => (
            <tr key={bill.id}>
              <td>{bill.invoiceNumber}</td>
              <td>{bill.patientName}</td>
              <td>{bill.date}</td>
              <td>{bill.paymentMode}</td>
              <td className="numeric">{bill.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default BillTable
