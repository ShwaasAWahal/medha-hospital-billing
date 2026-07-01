import { requestData } from './api.js'

export async function getBills() {
  return requestData({ method: 'get', url: '/bills' })
}

export async function getBill(billId) {
  return requestData({ method: 'get', url: `/bills/${encodeURIComponent(billId)}` })
}

export async function createBill(bill) {
  return requestData({ method: 'post', url: '/bills', data: bill })
}

export async function updateBill(billId, bill) {
  return requestData({
    method: 'put',
    url: `/bills/${encodeURIComponent(billId)}`,
    data: bill,
  })
}

export async function deleteBill(billId) {
  return requestData({ method: 'delete', url: `/bills/${encodeURIComponent(billId)}` })
}
