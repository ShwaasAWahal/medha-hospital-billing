import { requestData } from './api.js'

export async function getPatients() {
  return requestData({ method: 'get', url: '/patients' })
}

export async function getPatient(patientId) {
  return requestData({ method: 'get', url: `/patients/${encodeURIComponent(patientId)}` })
}

export async function createPatient(patient) {
  return requestData({ method: 'post', url: '/patients', data: patient })
}

export async function updatePatient(patientId, patient) {
  return requestData({
    method: 'put',
    url: `/patients/${encodeURIComponent(patientId)}`,
    data: patient,
  })
}

export async function deletePatient(patientId) {
  return requestData({
    method: 'delete',
    url: `/patients/${encodeURIComponent(patientId)}`,
  })
}
