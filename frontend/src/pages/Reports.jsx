import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { ErrorState, LoadingState } from '../components/PageState.jsx'
import { getApiErrorMessage } from '../services/api.js'
import { getBills } from '../services/billService.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
)

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})
const dayFormatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
})
const monthFormatter = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  year: 'numeric',
})

function startOfDay(value) {
  const date = new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function dayKey(value) {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function monthKey(value) {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}`
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context) => currencyFormatter.format(context.parsed.y),
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value) => `₹${Number(value).toLocaleString('en-IN')}`,
      },
      grid: {
        color: '#edf1f5',
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
}

function Reports() {
  const [bills, setBills] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadReports = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setBills(await getBills())
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load report data.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const report = useMemo(() => {
    const today = startOfDay(new Date())
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - 6)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const totalValue = bills.reduce(
      (sum, bill) => sum + Number(bill.grand_total),
      0,
    )
    const todayRevenue = bills
      .filter((bill) => new Date(bill.created_at) >= today)
      .reduce((sum, bill) => sum + Number(bill.grand_total), 0)
    const weeklyRevenue = bills
      .filter((bill) => new Date(bill.created_at) >= weekStart)
      .reduce((sum, bill) => sum + Number(bill.grand_total), 0)
    const monthlyRevenue = bills
      .filter((bill) => new Date(bill.created_at) >= monthStart)
      .reduce((sum, bill) => sum + Number(bill.grand_total), 0)

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + index)
      return date
    })
    const dailyRevenue = new Map(days.map((day) => [dayKey(day), 0]))
    bills.forEach((bill) => {
      const key = dayKey(bill.created_at)
      if (dailyRevenue.has(key)) {
        dailyRevenue.set(key, dailyRevenue.get(key) + Number(bill.grand_total))
      }
    })

    const months = Array.from({ length: 6 }, (_, index) => (
      new Date(today.getFullYear(), today.getMonth() - 5 + index, 1)
    ))
    const monthlyTotals = new Map(months.map((month) => [monthKey(month), 0]))
    bills.forEach((bill) => {
      const key = monthKey(bill.created_at)
      if (monthlyTotals.has(key)) {
        monthlyTotals.set(key, monthlyTotals.get(key) + Number(bill.grand_total))
      }
    })

    return {
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      billCount: bills.length,
      averageBillValue: bills.length ? totalValue / bills.length : 0,
      dailyChart: {
        labels: days.map((day) => dayFormatter.format(day)),
        datasets: [{
          label: 'Revenue',
          data: days.map((day) => dailyRevenue.get(dayKey(day))),
          backgroundColor: '#176b62',
          borderRadius: 6,
        }],
      },
      monthlyChart: {
        labels: months.map((month) => monthFormatter.format(month)),
        datasets: [{
          label: 'Revenue',
          data: months.map((month) => monthlyTotals.get(monthKey(month))),
          borderColor: '#1d4f7a',
          backgroundColor: 'rgb(29 79 122 / 12%)',
          pointBackgroundColor: '#1d4f7a',
          pointRadius: 4,
          tension: 0.3,
          fill: true,
        }],
      },
    }
  }, [bills])

  if (isLoading) {
    return <LoadingState message="Loading reports…" />
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadReports} />
  }

  const cards = [
    { label: "Today's revenue", value: currencyFormatter.format(report.todayRevenue) },
    { label: 'Last 7 days', value: currencyFormatter.format(report.weeklyRevenue) },
    { label: 'This month', value: currencyFormatter.format(report.monthlyRevenue) },
    { label: 'Number of bills', value: report.billCount.toLocaleString('en-IN') },
    { label: 'Average bill value', value: currencyFormatter.format(report.averageBillValue) },
  ]

  return (
    <div>
      <header className="page-heading">
        <h1>Reports</h1>
        <p>Revenue and billing performance based on saved invoices.</p>
      </header>
      <section className="report-summary" aria-label="Report summary">
        {cards.map((card) => (
          <article className="summary-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>
      <section className="report-charts">
        <article className="panel chart-panel">
          <div className="chart-heading">
            <h2>Daily revenue</h2>
            <p>Last seven calendar days</p>
          </div>
          <div className="chart-container">
            <Bar
              data={report.dailyChart}
              options={chartOptions}
              role="img"
              aria-label="Daily revenue for the last seven days"
            />
          </div>
        </article>
        <article className="panel chart-panel">
          <div className="chart-heading">
            <h2>Monthly revenue</h2>
            <p>Last six calendar months</p>
          </div>
          <div className="chart-container">
            <Line
              data={report.monthlyChart}
              options={chartOptions}
              role="img"
              aria-label="Monthly revenue for the last six months"
            />
          </div>
        </article>
      </section>
    </div>
  )
}

export default Reports
