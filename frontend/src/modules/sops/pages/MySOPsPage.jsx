import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import sopApi from '../../../api/sop.api'

export default function MySOPsPage() {
  const [pending, setPending]   = useState([])
  const [acked, setAcked]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('pending')

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const [pRes, aRes] = await Promise.all([
          sopApi.getMyPendingSOPs(),
          sopApi.getMyAcknowledgements(),
        ])
        setPending(pRes.data.data.pending)
        setAcked(aRes.data.data.acknowledgements)
      } catch { /* silent */ }
      setLoading(false)
    }
    fetch()
  }, [])

  const TABS = [
    { key: 'pending', label: 'Pending', count: pending.length, icon: AlertCircle, color: 'text-orange-300' },
    { key: 'done',    label: 'Acknowledged', count: acked.length, icon: CheckCircle, color: 'text-green-300' },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My SOPs</h1>
        <p className="text-gray-400 text-sm mt-0.5">SOPs you need to read and acknowledge</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            style={tab === t.key ? { backgroundColor: '#1E6FD9' } : {}}
          >
            <t.icon size={14} />
            {t.label}
            <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-white/10'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : tab === 'pending' ? (
        pending.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle size={40} className="mx-auto text-green-600 mb-3" />
            <p className="text-gray-400 font-medium">All caught up!</p>
            <p className="text-gray-600 text-sm mt-1">No mandatory SOPs pending acknowledgement</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(sop => (
              <Link key={sop._id} to={`/sops/${sop._id}`}
                className="flex items-center gap-4 p-4 rounded-xl border hover:border-orange-500/40 transition-colors"
                style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,107,0,0.15)' }}>
                  <AlertCircle size={18} className="text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{sop.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{sop.categoryId?.name} · v{sop.currentVersion}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900/40 text-orange-300">Mandatory</span>
                  <span className="text-xs text-gray-500">Read &amp; Acknowledge →</span>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        acked.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={40} className="mx-auto text-gray-700 mb-3" />
            <p className="text-gray-500">No acknowledgements yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {acked.map(ack => (
              <Link key={ack._id} to={`/sops/${ack.sopId?._id}`}
                className="flex items-center gap-4 p-4 rounded-xl border hover:border-green-500/30 transition-colors"
                style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
                  <CheckCircle size={18} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{ack.sopId?.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{ack.sopId?.categoryId?.name} · v{ack.sopVersionNumber}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-green-400 text-xs">Acknowledged</p>
                  <p className="text-gray-600 text-xs mt-0.5">{new Date(ack.acknowledgedAt).toLocaleDateString('en-IN')}</p>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  )
}
