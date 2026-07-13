import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import { InvalidCredentialsError, login } from '../services/authService.js'

function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(username.trim(), password, rememberMe)
      navigate('/dashboard', { replace: true })
    } catch (loginError) {
      if (loginError instanceof InvalidCredentialsError) {
        setError('Invalid username or password.')
      } else {
        setError('Unable to sign in. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand login-brand">
          <img src="logo.png" alt="MEDHA HOSPITAL Logo" className="brand-logo" />
          <span>MEDHA HOSPITAL</span>
        </div>
        <div className="page-heading">
          <h1>Welcome back</h1>
          <p>Sign in to continue to the billing system.</p>
        </div>
        <form className="form-stack" onSubmit={handleSubmit} aria-busy={isLoading}>
          <label>
            Username
            <input
              type="text"
              autoComplete="username"
              placeholder="Enter username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isLoading}
              required
              autoFocus
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
              required
            />
          </label>
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              disabled={isLoading}
            />
            Remember me
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button type="submit" className="button-block" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : 'Sign in'}
          </Button>
        </form>
      </section>
    </main>
  )
}

export default Login
