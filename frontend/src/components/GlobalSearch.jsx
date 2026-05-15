import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Users, Target, Handshake, UserSearch, FolderKanban, BookOpen, Clock } from 'lucide-react'
import axios from '../api/axios'

const MODULE_META = {
  leads:      { label: 'Lead',      icon: Target,       color: '#FF6B00' },
  clients:    { label: 'Client',    icon: Handshake,    color: '#00C6FF' },
  candidates: { label: 'Candidate', icon: UserSearch,   color: '#A78BFA' },
  employees:  { label: 'Employee',  icon: Users,        color: '#34D399' },
  projects:   { label: 'Project',   icon: FolderKanban, color: '#1E6FD9' },
  sops:       { label: 'SOP',       icon: BookOpen,     color: '#F59E0B' },
}

const RECENT_KEY = 'ams_recent_searches'
const MAX_RECENT = 8

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

function saveRecent(query) {
  if (!query.trim()) return
  const prev = getRecent().filter(q => q !== query)
  const next = [query, ...prev].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

function removeRecent(query) {
  const next = getRecent().filter(q => q !== query)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

export default function GlobalSearch({ open, onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [recent, setRecent]   = useState(getRecent())
  const [cursor, setCursor]   = useState(-1)
  const debounceRef = useRef(null)

  const allItems = results ? Object.entries(results).flatMap(([mod, items]) => items || []) : []

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults(null)
      setCursor(-1)
      setRecent(getRecent())
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setResults(null); return }
    setLoading(true)
    try {
      const res = await axios.get(`/search?q=${encodeURIComponent(q)}`)
      setResults(res.data.data.results)
    } catch { setResults({}) }
    finally { setLoading(false) }
  }, [])

  const handleChange = (e) => {
    const q = e.target.value
    setQuery(q)
    setCursor(-1)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q), 280)
  }

  const handleSelect = (item) => {
    saveRecent(query || '')
    setRecent(getRecent())
    onClose()
    navigate(item._url)
  }

  const handleRecentClick = (q) => {
    setQuery(q)
    doSearch(q)
  }

  const handleDeleteRecent = (e, q) => {
    e.stopPropagation()
    removeRecent(q)
    setRecent(getRecent())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return }
    if (allItems.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, allItems.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, -1)) }
    if (e.key === 'Enter' && cursor >= 0) { handleSelect(allItems[cursor]) }
  }

  if (!open) return null

  const hasResults = results && Object.values(results).some(arr => arr?.length > 0)

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh]"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#112044', border: '1px solid rgba(255,255,255,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Search leads, clients, employees, SOPs..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          {query && !loading && (
            <button onClick={() => { setQuery(''); setResults(null) }} className="text-gray-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          )}
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            Esc
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* No query — show recent */}
          {!query && recent.length > 0 && (
            <div className="px-4 pt-3 pb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Recent Searches</p>
              <div className="space-y-1">
                {recent.map(q => (
                  <button
                    key={q}
                    onClick={() => handleRecentClick(q)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors group"
                  >
                    <Clock size={14} className="flex-shrink-0 text-gray-600" />
                    <span className="flex-1 text-left">{q}</span>
                    <X
                      size={12}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white"
                      onClick={e => handleDeleteRecent(e, q)}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No query, no recent */}
          {!query && recent.length === 0 && (
            <div className="py-12 text-center text-gray-600 text-sm">
              <Search size={32} className="mx-auto mb-3 opacity-30" />
              <p>Start typing to search across all modules</p>
            </div>
          )}

          {/* Results */}
          {query.length >= 2 && !loading && results && (
            hasResults ? (
              <div className="py-2">
                {Object.entries(results).map(([mod, items]) => {
                  if (!items?.length) return null
                  const meta = MODULE_META[mod]
                  const Icon = meta?.icon || Search
                  return (
                    <div key={mod} className="mb-1">
                      <div className="flex items-center gap-2 px-4 py-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta?.color || '#888' }} />
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: meta?.color || '#888' }}>
                          {meta?.label || mod} ({items.length})
                        </p>
                      </div>
                      {items.map((item, idx) => {
                        const globalIdx = allItems.indexOf(item)
                        const isActive = cursor === globalIdx
                        return (
                          <button
                            key={item._id}
                            onClick={() => handleSelect(item)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                            style={{ backgroundColor: isActive ? 'rgba(30,111,217,0.2)' : 'transparent' }}
                            onMouseEnter={() => setCursor(globalIdx)}
                          >
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${meta?.color || '#888'}20` }}>
                              <Icon size={13} style={{ color: meta?.color || '#888' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white font-medium truncate">{item._label}</p>
                              {item._sub && <p className="text-xs text-gray-500 truncate">{item._sub}</p>}
                            </div>
                            <span className="text-xs text-gray-600 flex-shrink-0">{meta?.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-600 text-sm">
                <p>No results found for "<span className="text-gray-400">{query}</span>"</p>
              </div>
            )
          )}

          {/* Typing but less than 2 chars */}
          {query.length === 1 && (
            <div className="py-6 text-center text-gray-600 text-xs">Type at least 2 characters…</div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-gray-600" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span><kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>↵</kbd> Select</span>
          <span><kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
