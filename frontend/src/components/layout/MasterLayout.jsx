import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import GlobalSearch from '../GlobalSearch'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/users': 'Users',
  '/departments': 'Departments',
}

export default function MasterLayout() {
  const [collapsed, setCollapsed]       = useState(false)
  const [searchOpen, setSearchOpen]     = useState(false)
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'AMS'

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0A1628' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title={title} onSearchOpen={() => setSearchOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
