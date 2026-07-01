import Button from './Button.jsx'

function Modal({ isOpen, title, children, onClose, className = '' }) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close modal">&times;</Button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}

export default Modal
