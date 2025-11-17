'use client'

import { Search, X } from 'lucide-react'
import './SearchBar.css'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
  isLoading?: boolean
}

export default function SearchBar({ value, onChange, onSearch, isLoading = false }: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(value)
  }

  const handleClear = () => {
    onChange('')
    onSearch('')
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="search-input-wrapper">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="이메일 또는 User ID로 검색..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading}
        />
        {value && (
          <button
            type="button"
            className="clear-btn"
            onClick={handleClear}
            disabled={isLoading}
          >
            <X size={18} />
          </button>
        )}
      </div>
      <button type="submit" className="search-btn" disabled={isLoading}>
        {isLoading ? '검색 중...' : '검색'}
      </button>
    </form>
  )
}
