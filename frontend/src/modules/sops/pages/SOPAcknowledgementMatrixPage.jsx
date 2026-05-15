import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, Search } from 'lucide-react'
import sopApi from '../../../api/sop.api'

export default function SOPAcknowledgementMatrixPage() {
  const navigate = useNavigate()
  const [sops, setSops]           = useState([])
  const [selected, setSelected]   = useState(null)
  const [report, setReport]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [repLoading, setRepLoading] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const r = await sopApi.listSOPs({ status: 'published', limit: 100 })
        setSops(r.data.data.sops)
        if (r.data.data.sops.length > 0) {
          await loadReport(r.data.data.sops[0]._id)
          setSelected(r.data.data.sops[0]._id)
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    fetch()
  }, [])

  const loadReport = async (sopId) => {
    setRepLoading(true)
    try {
      const r = await sopApi.getAcknowledgementReport(sopId)
      setReport(r.data.data)
    } catch { setReport(null) }
    setRepLoading(false)
  }

  const selectSOP = (id) => { setSelected(id); loadReport(id) }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/sops')} className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></button>
        <h1 className="text-xl font-bold text-white flex-1">Acknowledgement Matrix</h1>
        <span className="text-sm text-gray-500">Who has acknowledged which SOP</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SOP list */}
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Published SOPs</p>
          {sops.length === 0 ? (
            <p className="text-gray-600 text-sm">No published SOPs yet</p>
          ) : sops.map(sop => (
            <button
              key={sop._id}
              onClick={() => selectSOP(sop._id)}
              className={`w-full text-left p-3 rounded-xl border text-sm transition-colors ${selected === sop._id ? 'border-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
              style={{ backgroundColor: selected === sop._id ? 'rgba(30,111,217,0.15)' : '#0f1f3d', borderColor: selected === sop._id ? '#1E6FD9' : 'rgba(255,255,255,0.08)' }}
            >
              <p className="font-medium truncate">{sop.title}</p>
              <p className="text-xs text-gray-600 mt-0.5">v{sop.currentVersion} · {sop.mandatory ? 'Mandatory' : 'Optional'}</p>
            </button>
          ))}
        </div>

        {/* Report */}
        <div className="lg:col-span-2">
          {repLoading ? (
            <div className="text-center py-12 text-gray-500">Loading report...</div>
          ) : !report ? (
            <div className="text-center py-12 text-gray-600">Select a SOP to see acknowledgements</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-semibold">{report.sop.title}</p>
                  <p className="text-gray-500 text-xs">v{report.sop.currentVersion}</p>
                </div>
                <span className="text-lg font-bold" style={{ color: '#00C6FF' }}>{report.totalAcknowledged}</span>
              </div>

              {report.acknowledgements.length === 0 ? (
                <div className="text-center py-10 text-gray-600">
                  <XCircle size={32} className="mx-auto mb-2 text-gray-700" />
                  <p>No one has acknowledged this SOP yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {report.acknowledgements.map(ack => (
                    <div key={ack._id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.06)' }}>
                      <CheckCircle size={16} className="text-green-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{ack.userId?.name}</p>
                        <p className="text-gray-500 text-xs">{ack.userId?.email} · {ack.userId?.role}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-gray-400 text-xs">{new Date(ack.acknowledgedAt).toLocaleDateString('en-IN')}</p>
                        {ack.signature && <p className="text-gray-600 text-xs italic mt-0.5">"{ack.signature}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
