import { requestData } from './api.js'

export async function getSettings() {
  return requestData({ method: 'get', url: '/settings' })
}

export async function updateSettings(settings) {
  return requestData({ method: 'put', url: '/settings', data: settings })
}
