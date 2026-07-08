import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import BillTable from '../components/BillTable.jsx'
import { ErrorState, LoadingState } from '../components/PageState.jsx'
import { getApiErrorMessage } from '../services/api.js'
import { getBills } from '../services/billService.js'
import { getPatients } from '../services/patientService.js'

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
})

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
})

function isToday(value) {
  const date = new Date(value)
  const today = new Date()
  return !Number.isNaN(date.getTime()) && date.toDateString() === today.toDateString()
}

function Dashboard() {
  const { employee } = useOutletContext()
  const [bills, setBills] = useState([])
  const [patients, setPatients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadDashboard() {
      try {
        const [billData, patientData] = await Promise.all([
          getBills(),
          getPatients(),
        ])

        if (isActive) {
          setBills(billData)
          setPatients(patientData)
        }
      } catch (requestError) {
        if (isActive) {
          setError(getApiErrorMessage(requestError, 'Unable to load dashboard data.'))
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadDashboard()
    return () => {
      isActive = false
    }
  }, [])

  if (isLoading) {
    return <LoadingState message="Loading dashboard…" />
  }

  if (error) {
    return <ErrorState message={error} />
  }

  const billsToday = bills.filter((bill) => isToday(bill.created_at))
  const patientsToday = patients.filter((patient) => isToday(patient.created_at))
  const todayRevenue = billsToday.reduce(
    (total, bill) => total + Number(bill.grand_total),
    0,
  )
  const patientNames = new Map(
    patients.map((patient) => [patient.id, patient.full_name]),
  )
  const recentBills = [...bills]
    .sort((first, second) => new Date(second.created_at) - new Date(first.created_at))
    .slice(0, 5)
    .map((bill) => ({
      id: bill.id,
      invoiceNumber: bill.invoice_number,
      patientName: patientNames.get(bill.patient_id) || `Patient #${bill.patient_id}`,
      date: dateFormatter.format(new Date(bill.created_at)),
      paymentMode: bill.payment_mode,
      total: currencyFormatter.format(Number(bill.grand_total)),
    }))

  const summaryCards = [
    { label: "Today's revenue", value: currencyFormatter.format(todayRevenue) },
    { label: 'Bills today', value: billsToday.length },
    { label: 'Patients today', value: patientsToday.length },
  ]

  return (
    <div>
      <header className="page-heading dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Welcome back, {employee.full_name}.
          </p>
        </div>
        <nav className="quick-actions" aria-label="Quick actions">
          <Link to="/bills/new" className="button button-primary">New bill</Link>
          <Link to="/patients" className="button button-secondary">Patients</Link>
          {employee?.role === 'Admin' && (
            <Link to="/reports" className="button button-secondary">Reports</Link>
          )}
        </nav>
      </header>
      <section className="summary-grid dashboard-summary" aria-label="Today's summary">
        {summaryCards.map((card) => (
          <article className="summary-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>
      <section className="panel">
        <div className="section-heading recent-bills-heading">
          <div>
            <h2>Recent bills</h2>
            <p>Latest invoices created by the billing team.</p>
          </div>
          <Link to="/bills" className="text-link">View all bills</Link>
        </div>
        <BillTable bills={recentBills} />
      </section>
    </div>
  )
}

export default Dashboard
