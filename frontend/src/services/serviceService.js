import { requestData } from './api.js'

export async function getServices() {
  return requestData({ method: 'get', url: '/services' })
}

export async function getService(serviceId) {
  return requestData({ method: 'get', url: `/services/${encodeURIComponent(serviceId)}` })
}

export async function createService(service) {
  return requestData({ method: 'post', url: '/services', data: service })
}

export async function updateService(serviceId, service) {
  return requestData({
    method: 'put',
    url: `/services/${encodeURIComponent(serviceId)}`,
    data: service,
  })
}

export async function deleteService(serviceId) {
  return requestData({
    method: 'delete',
    url: `/services/${encodeURIComponent(serviceId)}`,
  })
}
