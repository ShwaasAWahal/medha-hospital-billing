import Button from './Button.jsx'

function Pagination({ currentPage, totalPages, onPageChange, label = 'Table pagination' }) {
  return (
    <nav className="pagination" aria-label={label}>
      <span>Page {currentPage} of {totalPages}</span>
      <div>
        <Button
          variant="secondary"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </nav>
  )
}

export default Pagination
