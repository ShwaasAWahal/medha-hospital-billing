import axios from 'axios'

const TOKEN_KEY = 'hospital_billing_access_token'

export function getAccessToken() {
  return window.sessionStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token) {
  if (!token) throw new Error('An access token is required')
  window.sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearAccessToken() {
  window.sessionStorage.removeItem(TOKEN_KEY)
}

export function getApiErrorMessage(error, fallbackMessage) {
  if (error.code === 'ECONNABORTED') {
    return 'The request timed out. Please try again.'
  }
  if (!error.response) {
    return 'Unable to connect to the server. Check that the backend is running.'
  }

  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => item.msg).filter(Boolean)
    if (messages.length) return messages.join(', ')
  }
  return fallbackMessage
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

let redirectingToLogin = false

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAccessToken()

      if (window.location.pathname !== '/login' && !redirectingToLogin) {
        redirectingToLogin = true
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)

export async function requestData(config) {
  const response = await api.request(config)
  return response.data
}

export default api
