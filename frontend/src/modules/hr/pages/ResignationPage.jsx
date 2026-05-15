import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hrApi } from '../../../api/hr.api'
import { LogOut, AlertCircle } from 'lucide-react'
import dayjs from 'dayjs'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

export default function ResignationPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    resignationDate: dayjs().format('YYYY-MM-DD'),
    lastWorkingDay: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    reason: '',
    noticePeriodDays: 30,
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [confirmed, setConfirmed] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const noticeDays = dayjs(form.lastWorkingDay).diff(dayjs(form.resignationDate), 'day')

  const submit = async () => {
    if (!confirmed) { setMsg({ type: 'error', text: 'Please check the confirmation box' }); return }
    if (!form.reason.trim()) { setMsg({ type: 'error', text: 'Please provide a reason' }); return }
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      await hrApi.submitResignation({ ...form, noticePeriodDays: noticeDays })
      setMsg({ type: 'success', text: 'Resignation submitted successfully. Your manager and HR have been notified.' })
      setTimeout(() => navigate('/hr/me'), 3000)
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error?.message || 'Failed to submit resignation' })
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <LogOut size={22} style={{ color: '#EF4444' }} />
        <h1 className="text-xl font-bold">Submit Resignation</h1>
      </div>

      <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-300">
          <p className="font-semibold mb-1">Important Notice</p>
          <p>Once submitted, your resignation will be notified to your reporting manager and HR. Your notice period will begin from the resignation date. This action cannot be undone without HR approval.</p>
        </div>
      </div>

      <div className="rounded-xl p-6 space-y-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Resignation Date</label>
            <input type="date" className={inp} value={form.resignationDate}
              min={dayjs().format('YYYY-MM-DD')}
              onChange={e => set('resignationDate', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Last Working Day</label>
            <input type="date" className={inp} value={form.lastWorkingDay}
              min={form.resignationDate}
              onChange={e => set('lastWorkingDay', e.target.value)} />
          </div>
        </div>

        <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <span className="text-gray-400">Notice period: </span>
          <span className={`font-semibold ${noticeDays >= 30 ? 'text-green-400' : 'text-yellow-400'}`}>{noticeDays} days</span>
          {noticeDays < 30 && <span className="text-yellow-400 text-xs ml-2">(standard notice period is 30 days)</span>}
        </div>

        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Reason for Resignation</label>
          <textarea className={inp + ' resize-none'} rows={4}
            placeholder="Please briefly describe your reason for leaving (e.g. better opportunity, personal reasons, relocation…)"
            value={form.reason} onChange={e => set('reason', e.target.value)} />
        </div>

        <label className="flex items-start gap-3 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
            className="accent-red-500 mt-1 flex-shrink-0" />
          <span>I confirm that I am voluntarily submitting my resignation effective <strong className="text-white">{dayjs(form.resignationDate).format('DD MMM YYYY')}</strong>, with my last working day being <strong className="text-white">{dayjs(form.lastWorkingDay).format('DD MMM YYYY')}</strong>.</span>
        </label>

        {msg.text && (
          <p className={`text-sm ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg.text}</p>
        )}

        <button onClick={submit} disabled={saving || !confirmed}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: '#EF4444', color: '#fff' }}>
          {saving ? 'Submitting…' : 'Submit Resignation'}
        </button>
      </div>
    </div>
  )
}
