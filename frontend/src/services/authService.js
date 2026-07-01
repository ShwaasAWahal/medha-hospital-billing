import api, {
  clearAccessToken,
  getAccessToken,
  requestData,
  setAccessToken,
} from './api.js'

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid username or password')
    this.name = 'InvalidCredentialsError'
  }
}

export async function login(username, password) {
  const credentials = new URLSearchParams({ username, password })
  try {
    const response = await api.post('/login', credentials, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    setAccessToken(response.data.access_token)
    return response.data
  } catch (error) {
    if (error.response?.status === 401) {
      throw new InvalidCredentialsError()
    }
    throw error
  }
}

export function logout() {
  clearAccessToken()
}

export function isAuthenticated() {
  return Boolean(getAccessToken())
}

export async function getDashboard() {
  return requestData({ method: 'get', url: '/dashboard' })
}
