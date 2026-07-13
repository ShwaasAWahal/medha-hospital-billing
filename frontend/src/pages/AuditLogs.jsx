import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext, Navigate } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/PageState.jsx'
import Pagination from '../components/Pagination.jsx'
import { getApiErrorMessage } from '../services/api.js'
import { getAuditLogs } from '../services/auditService.js'
import { getEmployees } from '../services/employeeService.js'

const PAGE_SIZE = 8

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatStateDetails(log) {
  try {
    if (log.action === 'CREATE') {
      const state = JSON.parse(log.new_state || '{}')
      return (
        <div className="audit-detail-list">
          {Object.entries(state).map(([key, val]) => (
            <div key={key} className="audit-detail-item">
              <span className="audit-prop">{key}:</span>{' '}
              <span className="audit-val">{String(val ?? '—')}</span>
            </div>
          ))}
        </div>
      )
    }

    if (log.action === 'DELETE') {
      const state = JSON.parse(log.previous_state || '{}')
      return (
        <div className="audit-detail-list">
          {Object.entries(state).map(([key, val]) => (
            <div key={key} className="audit-detail-item">
              <span className="audit-prop">{key}:</span>{' '}
              <span className="audit-val-prev">{String(val ?? '—')}</span>
            </div>
          ))}
        </div>
      )
    }

    if (log.action === 'UPDATE') {
      const prev = JSON.parse(log.previous_state || '{}')
      const next = JSON.parse(log.new_state || '{}')
      const changedKeys = Object.keys(prev)
      
      if (changedKeys.length === 0) return <span className="audit-muted">No key properties modified</span>

      return (
        <div className="audit-detail-list">
          {changedKeys.map((key) => (
            <div key={key} className="audit-detail-item">
              <span className="audit-prop">{key}:</span>{' '}
              <span className="audit-val-prev">{String(prev[key] ?? '—')}</span>
              <span className="audit-arrow"> ➔ </span>
              <span className="audit-val">{String(next[key] ?? '—')}</span>
            </div>
          ))}
        </div>
      )
    }
  } catch {
    return <span className="audit-error-text">Unable to parse state history</span>
  }
  return null
}

function AuditLogs() {
  const { employee: loggedInEmployee } = useOutletContext()
  const isAdmin = loggedInEmployee?.role === 'Admin'

  const [logs, setLogs] = useState([])
  const [employees, setEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [tableFilter, setTableFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [logsData, employeesData] = await Promise.all([
        getAuditLogs(),
        getEmployees(),
      ])
      setLogs(logsData)
      setEmployees(employeesData)
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load security logs.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const employeeMap = useMemo(
    () => new Map(employees.map((emp) => [emp.id, emp])),
    [employees],
  )

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Search Query (matches table, target id, cashier name)
      const query = searchTerm.trim().toLowerCase()
      const employee = log.employee_id ? employeeMap.get(log.employee_id) : null
      const cashierName = employee ? employee.full_name.toLowerCase() : 'system'
      const matchesSearch = !query || (
        log.target_table.toLowerCase().includes(query) ||
        log.target_id.toLowerCase().includes(query) ||
        cashierName.includes(query)
      )

      // 2. Action Filter
      const matchesAction = !actionFilter || log.action === actionFilter

      // 3. Table Filter
      const matchesTable = !tableFilter || log.target_table === tableFilter

      return matchesSearch && matchesAction && matchesTable
    })
  }, [logs, searchTerm, actionFilter, tableFilter, employeeMap])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const visibleLogs = filteredLogs.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  // Non-admins are redirected or denied
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div>
      <style>{`
        .audit-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: bold;
          text-transform: uppercase;
        }
        .audit-badge.create {
          background-color: #e6f4ea;
          color: #137333;
        }
        .audit-badge.update {
          background-color: #fef7e0;
          color: #b06000;
        }
        .audit-badge.delete {
          background-color: #fce8e6;
          color: #c5221f;
        }
        .audit-detail-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-family: monospace;
          font-size: 0.75rem;
          max-width: 450px;
        }
        .audit-detail-item {
          word-break: break-all;
        }
        .audit-prop {
          color: #555;
          font-weight: bold;
        }
        .audit-val {
          color: #137333;
        }
        .audit-val-prev {
          color: #c5221f;
          text-decoration: line-through;
        }
        .audit-arrow {
          color: #888;
        }
        .audit-muted {
          color: #888;
          font-style: italic;
          font-size: 0.75rem;
        }
        .audit-error-text {
          color: #c5221f;
          font-size: 0.75rem;
        }
        .audit-filters {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        @media (max-width: 768px) {
          .audit-filters {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
      `}</style>

      <header className="page-heading">
        <h1>Audit Logs</h1>
        <p>Review system transactions, patient profile creations, bill updates, and configuration revisions.</p>
      </header>

      <section className="panel">
        <div className="audit-filters">
          <label>
            Search logs
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search by cashier, table, or ID"
            />
          </label>
          <label>
            Action
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </label>
          <label>
            Entity Table
            <select
              value={tableFilter}
              onChange={(e) => {
                setTableFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">All Tables</option>
              <option value="patients">Patients</option>
              <option value="bills">Bills</option>
              <option value="services">Services</option>
              <option value="employees">Employees</option>
              <option value="hospital_settings">Hospital Settings</option>
            </select>
          </label>
        </div>

        {isLoading ? (
          <LoadingState message="Loading security audit trail…" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={loadData} />
        ) : (
          <>
            <div className="table-meta">
              <span>{filteredLogs.length} entries found</span>
            </div>
            <div className="table-wrap">
              <table className="patients-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Cashier</th>
                    <th>Action</th>
                    <th>Target Table</th>
                    <th>Target ID</th>
                    <th>State Changes Details</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        No audit logs matching filters found.
                      </td>
                    </tr>
                  ) : (
                    visibleLogs.map((log) => {
                      const employee = log.employee_id
                        ? employeeMap.get(log.employee_id)
                        : null
                      const cashierName = employee
                        ? employee.full_name
                        : 'System/Default'

                      return (
                        <tr key={log.id}>
                          <td><strong>{dateFormatter.format(new Date(log.timestamp))}</strong></td>
                          <td>{cashierName}</td>
                          <td>
                            <span className={`audit-badge ${log.action.toLowerCase()}`}>
                              {log.action}
                            </span>
                          </td>
                          <td><code>{log.target_table}</code></td>
                          <td><code>{log.target_id}</code></td>
                          <td>{formatStateDetails(log)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              label="Audit logs pagination"
            />
          </>
        )}
      </section>
    </div>
  )
}

export default AuditLogs
