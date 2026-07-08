import { requestData } from './api.js'

export async function getEmployees() {
  return requestData({ method: 'get', url: '/employees' })
}

export async function getEmployee(employeeId) {
  return requestData({ method: 'get', url: `/employees/${encodeURIComponent(employeeId)}` })
}

export async function createEmployee(employee) {
  return requestData({ method: 'post', url: '/employees', data: employee })
}

export async function updateEmployee(employeeId, employee) {
  return requestData({
    method: 'put',
    url: `/employees/${encodeURIComponent(employeeId)}`,
    data: employee,
  })
}

export async function deleteEmployee(employeeId) {
  return requestData({
    method: 'delete',
    url: `/employees/${encodeURIComponent(employeeId)}`,
  })
}

