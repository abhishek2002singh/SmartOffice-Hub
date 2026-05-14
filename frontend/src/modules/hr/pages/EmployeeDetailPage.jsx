import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { hrApi } from '../../../api/hr.api'
import {
  User, Briefcase, FolderOpen, Users, ArrowLeft,
  Upload, Trash2, Plus, X, Edit3, Check,
} from 'lucide-react'

const TABS = ['Profile', 'Employment', 'Documents', 'Family']

const FIELD_ROW = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
    <span className="text-sm text-white">{value || '—'}</span>
  </div>
)

const DOC_TYPE_LABELS = {
  offer_letter: 'Offer Letter', joining_letter: 'Joining Letter', appointment_letter: 'Appointment Letter',
  id_proof: 'ID Proof', address_proof: 'Address Proof', pan_card: 'PAN Card',
  aadhaar_card: 'Aadhaar Card', education: 'Education', experience: 'Experience',
  relieving: 'Relieving Letter', nda: 'NDA', other: 'Other',
}

function DocumentLocker({ empId }) {
  const [docs, setDocs]           = useState([])
  const [uploading, setUploading] = useState(false)
  const [form, setForm]           = useState({ type: 'id_proof', expiresAt: '' })
  const [file, setFile]           = useState(null)

  const load = async () => {
    try { const r = await hrApi.listDocuments(empId); setDocs(r.data.data.documents) } catch (_) {}
  }
  useEffect(() => { if (empId) load() }, [empId])

  const upload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', form.type)
      if (form.expiresAt) fd.append('expiresAt', form.expiresAt)
      await hrApi.uploadDocument(empId, fd)
      setFile(null)
      await load()
    } catch (_) {}
    finally { setUploading(false) }
  }

  const remove = async (docId) => {
    if (!confirm('Delete document?')) return
    await hrApi.deleteDocument(empId, docId)
    setDocs(d => d.filter(x => x._id !== docId))
  }

  return (
    <div className="space-y-4">
      {/* Upload form */}
      <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-sm font-semibold text-white">Upload Document</p>
        <div className="grid grid-cols-3 gap-3">
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none"
          >
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input
            type="date"
            value={form.expiresAt}
            onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none"
            placeholder="Expiry (optional)"
          />
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={e => setFile(e.target.files[0])}
            className="text-sm text-gray-300 file:mr-2 file:px-3 file:py-1 file:rounded file:text-xs file:font-medium file:text-white file:border-0"
            style={{ '--file-bg': '#1E6FD9' }}
          />
        </div>
        <button
          onClick={upload}
          disabled={!file || uploading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#1E6FD9', color: '#fff' }}
        >
          <Upload size={14} />{uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {/* Doc list */}
      {docs.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No documents uploaded</p>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc._id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                <FolderOpen size={16} style={{ color: '#00C6FF' }} />
                <div>
                  <p className="text-sm text-white">{doc.name}</p>
                  <p className="text-xs text-gray-400">{DOC_TYPE_LABELS[doc.type] || doc.type}
                    {doc.expiresAt && <span className="ml-2 text-orange-400">Expires: {new Date(doc.expiresAt).toLocaleDateString('en-IN')}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {doc.gdriveLink && (
                  <a href={doc.gdriveLink} target="_blank" rel="noreferrer"
                    className="text-xs px-2 py-1 rounded text-blue-400 border border-blue-400/30 hover:bg-blue-400/10">View</a>
                )}
                <button onClick={() => remove(doc._id)} className="p-1 text-red-400 hover:text-red-300">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FamilyTab({ empId }) {
  const [members, setMembers] = useState([])
  const [adding, setAdding]   = useState(false)
  const [form, setForm]       = useState({ name: '', relation: 'Spouse', contact: '', isNominee: false })

  const load = async () => {
    try { const r = await hrApi.listFamily(empId); setMembers(r.data.data.members) } catch (_) {}
  }
  useEffect(() => { if (empId) load() }, [empId])

  const save = async () => {
    try {
      await hrApi.addFamilyMember(empId, form)
      setForm({ name: '', relation: 'Spouse', contact: '', isNominee: false })
      setAdding(false)
      await load()
    } catch (_) {}
  }

  const remove = async (memberId) => {
    await hrApi.deleteFamilyMember(empId, memberId)
    setMembers(m => m.filter(x => x._id !== memberId))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-white">Family Members</p>
        <button onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium"
          style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
          <Plus size={12} /> Add Member
        </button>
      </div>

      {adding && (
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Full name*" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none" />
            <select value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none">
              {['Spouse','Father','Mother','Son','Daughter','Brother','Sister','Guardian','Other'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input placeholder="Contact number" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none" />
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={form.isNominee} onChange={e => setForm(f => ({ ...f, isNominee: e.target.checked }))} />
              Nominee
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded text-xs font-medium" style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>Save</button>
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded text-xs font-medium bg-white/5 text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {members.length === 0 && !adding ? (
        <p className="text-gray-400 text-sm text-center py-8">No family members added</p>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m._id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-sm text-white font-medium">{m.name} {m.isNominee && <span className="text-xs px-1 py-0.5 rounded ml-1" style={{ backgroundColor: '#FF6B00', color: '#fff' }}>Nominee</span>}</p>
                <p className="text-xs text-gray-400">{m.relation}{m.contact ? ` · ${m.contact}` : ''}</p>
              </div>
              <button onClick={() => remove(m._id)} className="p-1 text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EmployeeDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const canViewSensitive = ['ADMIN', 'SUPERADMIN'].includes(user?.role)

  const [employee, setEmployee] = useState(null)
  const [tab, setTab]           = useState('Profile')
  const [loading, setLoading]   = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({})
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    hrApi.getEmployee(id)
      .then(r => { setEmployee(r.data.data.employee); setEditData(r.data.data.employee) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const save = async () => {
    setSaving(true)
    try {
      const r = await hrApi.updateEmployee(id, editData)
      setEmployee(r.data.data.employee)
      setEditMode(false)
    } catch (_) {}
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>
  if (!employee) return <div className="p-10 text-center text-gray-400">Employee not found</div>

  const fullName = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ')

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto" style={{ color: '#fff' }}>
      {/* Back */}
      <button onClick={() => navigate('/hr/employees')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
        <ArrowLeft size={16} /> Back to Directory
      </button>

      {/* Header */}
      <div className="rounded-2xl p-6 flex items-start justify-between" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: '#1E6FD9' }}>
            {fullName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{fullName}</h1>
            <p className="text-gray-400 text-sm">{employee.designation || 'No designation'} · {employee.departmentId?.name || 'No department'}</p>
            <p className="text-xs font-mono mt-1" style={{ color: '#00C6FF' }}>{employee.employeeCode}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium"
                style={{ backgroundColor: '#10B981', color: '#fff' }}>
                <Check size={12} />{saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditMode(false); setEditData(employee) }}
                className="px-3 py-1.5 rounded text-xs font-medium bg-white/5 text-gray-300">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-white/5 text-gray-300 hover:text-white">
              <Edit3 size={12} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'text-white border-blue-500' : 'text-gray-400 border-transparent hover:text-white'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-xl p-6 space-y-6" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        {tab === 'Profile' && (
          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Personal</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FIELD_ROW label="First Name"     value={employee.firstName} />
                <FIELD_ROW label="Middle Name"    value={employee.middleName} />
                <FIELD_ROW label="Last Name"      value={employee.lastName} />
                <FIELD_ROW label="Date of Birth"  value={employee.dob ? new Date(employee.dob).toLocaleDateString('en-IN') : null} />
                <FIELD_ROW label="Gender"         value={employee.gender} />
                <FIELD_ROW label="Marital Status" value={employee.maritalStatus} />
                <FIELD_ROW label="Blood Group"    value={employee.bloodGroup} />
              </div>
            </section>
            <hr style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Contact</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FIELD_ROW label="Phone"           value={employee.phone} />
                <FIELD_ROW label="Personal Email"  value={employee.personalEmail} />
                <FIELD_ROW label="Official Email"  value={employee.officialEmail} />
                <FIELD_ROW label="Current Address" value={employee.currentAddress} />
                <FIELD_ROW label="Permanent Address" value={employee.permanentAddress} />
              </div>
            </section>
            <hr style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-3 gap-4">
                <FIELD_ROW label="Name"     value={employee.emergencyContactName} />
                <FIELD_ROW label="Phone"    value={employee.emergencyContactPhone} />
                <FIELD_ROW label="Relation" value={employee.emergencyContactRelation} />
              </div>
            </section>
          </div>
        )}

        {tab === 'Employment' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FIELD_ROW label="Designation"       value={employee.designation} />
              <FIELD_ROW label="Department"        value={employee.departmentId?.name} />
              <FIELD_ROW label="Reporting Manager" value={employee.reportingManagerId ? [employee.reportingManagerId.firstName, employee.reportingManagerId.lastName].join(' ') : null} />
              <FIELD_ROW label="Date of Joining"   value={employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString('en-IN') : null} />
              <FIELD_ROW label="Employment Type"   value={employee.employmentType} />
              <FIELD_ROW label="Employment Status" value={employee.employmentStatus} />
              <FIELD_ROW label="Probation End"     value={employee.probationEndDate ? new Date(employee.probationEndDate).toLocaleDateString('en-IN') : null} />
              <FIELD_ROW label="Confirmation Date" value={employee.confirmationDate ? new Date(employee.confirmationDate).toLocaleDateString('en-IN') : null} />
              <FIELD_ROW label="Office Location"   value={employee.officeLocation} />
            </div>

            {canViewSensitive && employee.currentCTC && (
              <>
                <hr style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                <section>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Salary (Restricted)</h3>
                  <FIELD_ROW label="Current CTC" value={employee.currentCTC ? `₹${employee.currentCTC.toLocaleString('en-IN')}/yr` : null} />
                </section>
              </>
            )}

            {employee.exitInfo?.exitDate && (
              <>
                <hr style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                <section>
                  <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4">Exit Info</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FIELD_ROW label="Exit Date"    value={new Date(employee.exitInfo.exitDate).toLocaleDateString('en-IN')} />
                    <FIELD_ROW label="Exit Reason"  value={employee.exitInfo.exitReason} />
                    <FIELD_ROW label="Settlement"   value={employee.exitInfo.finalSettlementStatus} />
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {tab === 'Documents' && <DocumentLocker empId={id} />}

        {tab === 'Family' && <FamilyTab empId={id} />}
      </div>
    </div>
  )
}
