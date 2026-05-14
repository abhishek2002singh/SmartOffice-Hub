import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { User, Edit3, Check, X } from 'lucide-react'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 w-full"

const SELF_EDITABLE = [
  { key: 'phone',                    label: 'Phone' },
  { key: 'personalEmail',            label: 'Personal Email',     type: 'email' },
  { key: 'currentAddress',           label: 'Current Address',    multiline: true },
  { key: 'permanentAddress',         label: 'Permanent Address',  multiline: true },
  { key: 'emergencyContactName',     label: 'Emergency Contact Name' },
  { key: 'emergencyContactPhone',    label: 'Emergency Contact Phone' },
  { key: 'emergencyContactRelation', label: 'Emergency Contact Relation' },
  { key: 'bloodGroup',               label: 'Blood Group' },
]

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-white">{value || '—'}</span>
    </div>
  )
}

export default function EmployeeSelfServicePage() {
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const r = await hrApi.getMyProfile()
      setEmployee(r.data.data.employee)
      setForm(r.data.data.employee)
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    setMsg('')
    try {
      const patch = {}
      SELF_EDITABLE.forEach(({ key }) => { patch[key] = form[key] || '' })
      await hrApi.updateMyProfile(patch)
      setMsg('Profile updated successfully')
      setEditMode(false)
      await load()
    } catch (err) {
      setMsg(err.response?.data?.error?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>

  if (!employee) return (
    <div className="p-10 text-center" style={{ color: '#fff' }}>
      <User size={48} className="mx-auto mb-4 text-gray-500" />
      <p className="text-gray-400">No employee profile linked to your account.</p>
      <p className="text-xs text-gray-500 mt-2">Contact HR to link your employee record.</p>
    </div>
  )

  const fullName = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ')

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" style={{ color: '#fff' }}>
      {/* Header card */}
      <div className="rounded-2xl p-6 flex items-start justify-between" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: '#1E6FD9' }}>
            {fullName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{fullName}</h1>
            <p className="text-gray-400 text-sm">{employee.designation || 'No designation'}</p>
            <p className="text-xs font-mono mt-1" style={{ color: '#00C6FF' }}>{employee.employeeCode}</p>
          </div>
        </div>
        {!editMode ? (
          <button onClick={() => setEditMode(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-white/5 text-gray-300 hover:text-white">
            <Edit3 size={12} /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium"
              style={{ backgroundColor: '#10B981', color: '#fff' }}>
              <Check size={12} />{saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => { setEditMode(false); setForm(employee) }}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-white/5 text-gray-300">
              <X size={12} /> Cancel
            </button>
          </div>
        )}
      </div>

      {msg && <div className={`px-4 py-3 rounded-lg text-sm ${msg.includes('success') ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>{msg}</div>}

      {/* Read-only employment section */}
      <div className="rounded-xl p-6" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Employment (read-only)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow label="Department"        value={employee.departmentId?.name} />
          <InfoRow label="Date of Joining"   value={employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString('en-IN') : null} />
          <InfoRow label="Employment Type"   value={employee.employmentType} />
          <InfoRow label="Employment Status" value={employee.employmentStatus} />
          <InfoRow label="Office Location"   value={employee.officeLocation} />
          <InfoRow label="Official Email"    value={employee.officialEmail} />
        </div>
      </div>

      {/* Editable personal info */}
      <div className="rounded-xl p-6" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Personal Details</h2>
        {editMode ? (
          <div className="grid grid-cols-2 gap-4">
            {SELF_EDITABLE.map(({ key, label, type, multiline }) => (
              <div key={key} className={multiline ? 'col-span-2' : ''}>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</label>
                {multiline
                  ? <textarea className={inp} rows={2} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  : <input className={inp} type={type || 'text'} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                }
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {SELF_EDITABLE.map(({ key, label }) => (
              <InfoRow key={key} label={label} value={employee[key]} />
            ))}
          </div>
        )}
      </div>

      {/* Read-only personal */}
      <div className="rounded-xl p-6" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Identity (read-only)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow label="Date of Birth"   value={employee.dob ? new Date(employee.dob).toLocaleDateString('en-IN') : null} />
          <InfoRow label="Gender"          value={employee.gender} />
          <InfoRow label="Marital Status"  value={employee.maritalStatus} />
        </div>
      </div>
    </div>
  )
}
