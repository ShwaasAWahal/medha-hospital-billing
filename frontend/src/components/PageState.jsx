import Button from './Button.jsx'

export function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="dashboard-loading" role="status">
      <span className="page-spinner" aria-hidden="true" />
      {message}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="status-message error-message" role="alert">
      <span>{message}</span>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  )
}
