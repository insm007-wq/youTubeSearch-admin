'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
  isLoading?: boolean
}

export default function SearchBar({
  value,
  onChange,
  onSearch,
  isLoading = false,
}: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(value)
  }

  const handleClear = () => {
    onChange('')
    onSearch('')
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="이메일 또는 User ID로 검색..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isLoading}
            className="pl-10 pr-10"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded transition-colors"
              aria-label="검색 입력 지우기"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Button type="submit" disabled={isLoading} className="px-6">
          {isLoading ? '검색 중...' : '검색'}
        </Button>
      </div>
    </form>
  )
}
