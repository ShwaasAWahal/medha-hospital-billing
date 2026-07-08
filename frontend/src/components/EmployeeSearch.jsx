function EmployeeSearch({ value = '', onChange, placeholder = 'Search by username or full name' }) {
  return (
    <label className="search-field">
      <span className="sr-only">Search employees</span>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  )
}

export default EmployeeSearch

