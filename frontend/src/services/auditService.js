import { requestData } from './api.js'

export async function getAuditLogs() {
  return requestData({ method: 'get', url: '/audit-logs' })
}
