function PatientSearch({ value = '', onChange, placeholder = 'Search by patient code or phone' }) {
  return (
    <label className="search-field">
      <span className="sr-only">Search patients</span>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  )
}

export default PatientSearch
