import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { hrApi } from '../../../api/hr.api'
import api from '../../../api/axios'
import { Check, ArrowLeft, ArrowRight, UserCheck } from 'lucide-react'

const STEPS = ['Basic Info', 'Employment', 'Salary & Bank', 'Confirm']

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
            i < current ? 'border-green-500 bg-green-500 text-white'
            : i === current ? 'border-blue-500 bg-blue-500 text-white'
            : 'border-gray-600 text-gray-500'
          }`}>
            {i < current ? <Check size={14} /> : i + 1}
          </div>
          <span className={`text-sm font-medium ${i === current ? 'text-white' : i < current ? 'text-green-400' : 'text-gray-500'}`}>{step}</span>
          {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < current ? 'bg-green-500' : 'bg-gray-700'}`} />}
        </div>
      ))}
    </div>
  )
}

const Field = ({ label, children, required }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-gray-400 uppercase tracking-wider">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
    {children}
  </div>
)

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 w-full"

export default function OnboardingWizardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlCandidateId = searchParams.get('candidateId')

  const [step, setStep]               = useState(0)
  const [candidate, setCandidate]     = useState(null)
  const [candidateId, setCandidateId] = useState(urlCandidateId || '')
  const [candidates, setCandidates]   = useState([])
  const [depts, setDepts]             = useState([])
  const [employees, setEmployees]     = useState([])
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  const [form, setForm] = useState({
    // Basic (from candidate — pre-filled)
    firstName: '', middleName: '', lastName: '', dob: '', gender: 'Male', maritalStatus: 'Unmarried',
    bloodGroup: '', personalEmail: '', phone: '', currentAddress: '',
    // Employment
    officialEmail: '', designation: '', departmentId: '', reportingManagerId: '',
    dateOfJoining: '', employmentType: 'Full Time', officeLocation: 'Delhi',
    probationEndDate: '',
    // Salary & Bank
    currentCTC: '', bankName: '', accountNumber: '', ifsc: '', branch: '', accountType: 'Savings',
    panNumber: '', aadhaarNumber: '', uanNumber: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Load candidates list if no candidateId from URL
  useEffect(() => {
    if (!urlCandidateId) {
      hrApi.listCandidates({ limit: 200, status: 'Selected' })
        .then(r => setCandidates(r.data?.data?.candidates || []))
        .catch(() => {})
    }
  }, [urlCandidateId])

  // Load depts + managers
  useEffect(() => {
    Promise.all([
      api.get('/departments'),
      hrApi.listEmployees({ limit: 100 }),
    ]).then(([d, e]) => {
      setDepts(d.data?.data?.departments || [])
      setEmployees(e.data?.data?.employees || [])
    }).catch(() => {})
  }, [])

  // Pre-fill form when candidateId is set
  useEffect(() => {
    if (!candidateId) return
    hrApi.getCandidate(candidateId).then(r => {
      const c = r.data.data.candidate
      setCandidate(c)
      setForm(f => ({
        ...f,
        firstName: c.firstName || '',
        middleName: c.middleName || '',
        lastName: c.lastName || '',
        dob: c.dob ? c.dob.slice(0, 10) : '',
        gender: c.gender || 'Male',
        maritalStatus: c.maritalStatus || 'Unmarried',
        personalEmail: c.email || '',
        phone: c.phone || '',
        currentAddress: c.address || '',
      }))
    }).catch(() => {})
  }, [candidateId])

  const validate = () => {
    if (step === 0 && !form.firstName) return 'First name is required'
    if (step === 1 && !form.dateOfJoining) return 'Date of joining is required'
    if (step === 1 && !form.designation) return 'Designation is required'
    return ''
  }

  const next = () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        firstName: form.firstName, middleName: form.middleName, lastName: form.lastName,
        dob: form.dob || undefined,
        gender: form.gender, maritalStatus: form.maritalStatus,
        bloodGroup: form.bloodGroup, personalEmail: form.personalEmail, phone: form.phone,
        currentAddress: form.currentAddress,
        officialEmail:      form.officialEmail,
        designation:        form.designation,
        departmentId:       form.departmentId || undefined,
        reportingManagerId: form.reportingManagerId || undefined,
        dateOfJoining:      form.dateOfJoining,
        employmentType:     form.employmentType,
        officeLocation:     form.officeLocation,
        probationEndDate:   form.probationEndDate || undefined,
        currentCTC:         form.currentCTC ? +form.currentCTC : undefined,
        bankDetails: {
          bankName:      form.bankName,
          accountNumber: form.accountNumber,
          ifsc:          form.ifsc,
          branch:        form.branch,
          accountType:   form.accountType,
        },
        statutory: {
          panNumber:    form.panNumber,
          aadhaarNumber: form.aadhaarNumber,
          uanNumber:    form.uanNumber,
        },
      }
      if (!candidateId) {
        setError('Please select a candidate from the dropdown above before onboarding.')
        setSaving(false)
        return
      }
      const r = await hrApi.onboardEmployee(candidateId, payload)
      navigate(`/hr/employees/${r.data.data.employee._id}`)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Onboarding failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/hr/employees')} className="p-1 text-gray-400 hover:text-white"><ArrowLeft size={18} /></button>
        <div className="flex items-center gap-2">
          <UserCheck size={22} style={{ color: '#1E6FD9' }} />
          <h1 className="text-xl font-bold">Onboard Employee</h1>
          {candidate && <span className="text-sm text-gray-400">from candidate: {candidate.firstName} {candidate.lastName}</span>}
        </div>
      </div>

      {/* Candidate picker — shown only when no candidate preselected from URL */}
      {!urlCandidateId && (
        <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          <label className="text-xs text-gray-400 uppercase tracking-wider">Select Candidate to Onboard <span className="text-red-400">*</span></label>
          <select
            value={candidateId}
            onChange={e => { setCandidateId(e.target.value); setCandidate(null) }}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="">— Choose a candidate —</option>
            {candidates.map(c => (
              <option key={c._id} value={c._id}>
                {c.firstName} {c.lastName} · {c.appliedProfile} · {c.phone}
              </option>
            ))}
          </select>
          {candidates.length === 0 && (
            <p className="text-xs text-gray-500">No candidates with status "Selected" found. Go to <button onClick={() => navigate('/hr/candidates')} className="text-blue-400 underline">Candidates</button> and mark one as Selected first.</p>
          )}
        </div>
      )}

      <StepIndicator current={step} />

      {error && <div className="px-4 py-3 rounded-lg text-sm text-red-300 bg-red-500/10 border border-red-500/20">{error}</div>}

      <div className="rounded-xl p-6 space-y-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Step 0: Basic Info */}
        {step === 0 && (
          <>
            <h2 className="font-semibold text-white mb-4">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" required><input className={inp} value={form.firstName} onChange={e => set('firstName', e.target.value)} /></Field>
              <Field label="Middle Name"><input className={inp} value={form.middleName} onChange={e => set('middleName', e.target.value)} /></Field>
              <Field label="Last Name"><input className={inp} value={form.lastName} onChange={e => set('lastName', e.target.value)} /></Field>
              <Field label="Date of Birth"><input type="date" className={inp} value={form.dob} onChange={e => set('dob', e.target.value)} /></Field>
              <Field label="Gender">
                <select className={inp} value={form.gender} onChange={e => set('gender', e.target.value)}>
                  {['Male','Female','Other'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Marital Status">
                <select className={inp} value={form.maritalStatus} onChange={e => set('maritalStatus', e.target.value)}>
                  {['Unmarried','Married','Other'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Blood Group"><input className={inp} placeholder="A+, B+, O-, etc." value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)} /></Field>
              <Field label="Phone"><input className={inp} value={form.phone} onChange={e => set('phone', e.target.value)} /></Field>
              <Field label="Personal Email" className="col-span-2"><input className={inp} type="email" value={form.personalEmail} onChange={e => set('personalEmail', e.target.value)} /></Field>
              <Field label="Current Address" className="col-span-2"><textarea className={inp} rows={2} value={form.currentAddress} onChange={e => set('currentAddress', e.target.value)} /></Field>
            </div>
          </>
        )}

        {/* Step 1: Employment */}
        {step === 1 && (
          <>
            <h2 className="font-semibold text-white mb-4">Employment Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Official Email"><input type="email" className={inp} value={form.officialEmail} onChange={e => set('officialEmail', e.target.value)} /></Field>
              <Field label="Designation" required><input className={inp} value={form.designation} onChange={e => set('designation', e.target.value)} /></Field>
              <Field label="Department">
                <select className={inp} value={form.departmentId} onChange={e => set('departmentId', e.target.value)}>
                  <option value="">Select department</option>
                  {depts.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Reporting Manager">
                <select className={inp} value={form.reportingManagerId} onChange={e => set('reportingManagerId', e.target.value)}>
                  <option value="">Select manager</option>
                  {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
                </select>
              </Field>
              <Field label="Date of Joining" required><input type="date" className={inp} value={form.dateOfJoining} onChange={e => set('dateOfJoining', e.target.value)} /></Field>
              <Field label="Employment Type">
                <select className={inp} value={form.employmentType} onChange={e => set('employmentType', e.target.value)}>
                  {['Full Time','Part Time','Internship','Freelance','Contract'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Office Location"><input className={inp} value={form.officeLocation} onChange={e => set('officeLocation', e.target.value)} /></Field>
              <Field label="Probation End Date"><input type="date" className={inp} value={form.probationEndDate} onChange={e => set('probationEndDate', e.target.value)} /></Field>
            </div>
          </>
        )}

        {/* Step 2: Salary & Bank */}
        {step === 2 && (
          <>
            <h2 className="font-semibold text-white mb-2">Salary & Bank Details</h2>
            <p className="text-xs text-orange-300 mb-4">Sensitive data — encrypted at rest. Visible to Admin/Superadmin only.</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Current CTC (₹/yr)"><input type="number" className={inp} value={form.currentCTC} onChange={e => set('currentCTC', e.target.value)} /></Field>
              <div />
              <Field label="Bank Name"><input className={inp} value={form.bankName} onChange={e => set('bankName', e.target.value)} /></Field>
              <Field label="Account Number"><input className={inp} value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} /></Field>
              <Field label="IFSC Code"><input className={inp} value={form.ifsc} onChange={e => set('ifsc', e.target.value)} /></Field>
              <Field label="Branch"><input className={inp} value={form.branch} onChange={e => set('branch', e.target.value)} /></Field>
              <Field label="Account Type">
                <select className={inp} value={form.accountType} onChange={e => set('accountType', e.target.value)}>
                  {['Savings','Current'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <div />
              <Field label="PAN Number"><input className={inp} value={form.panNumber} onChange={e => set('panNumber', e.target.value)} /></Field>
              <Field label="Aadhaar Number"><input className={inp} value={form.aadhaarNumber} onChange={e => set('aadhaarNumber', e.target.value)} /></Field>
              <Field label="UAN (PF)"><input className={inp} value={form.uanNumber} onChange={e => set('uanNumber', e.target.value)} /></Field>
            </div>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <>
            <h2 className="font-semibold text-white mb-4">Review & Confirm</h2>
            <div className="space-y-4 text-sm">
              {[
                ['Name', [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ')],
                ['Gender / Marital Status', `${form.gender} / ${form.maritalStatus}`],
                ['Phone', form.phone],
                ['Personal Email', form.personalEmail],
                ['Official Email', form.officialEmail],
                ['Designation', form.designation],
                ['Date of Joining', form.dateOfJoining],
                ['Employment Type', form.employmentType],
                ['Office Location', form.officeLocation],
                ['CTC', form.currentCTC ? `₹${Number(form.currentCTC).toLocaleString('en-IN')}/yr` : 'Not set'],
                ['Bank', form.bankName || 'Not set'],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between border-b pb-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-gray-400">{l}</span>
                  <span className="text-white font-medium">{v || '—'}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              {form.officialEmail ? `An AMS login will be created for ${form.officialEmail} with a default password.` : 'No AMS login will be created (no official email provided).'}
            </p>
          </>
        )}
      </div>

      {/* Nav */}
      <div className="flex justify-between">
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/hr/employees')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300 hover:text-white"
        >
          <ArrowLeft size={14} />{step > 0 ? 'Previous' : 'Cancel'}
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={next}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
            Next <ArrowRight size={14} />
          </button>
        ) : (
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#10B981', color: '#fff' }}>
            <UserCheck size={14} />{saving ? 'Onboarding…' : 'Onboard Employee'}
          </button>
        )}
      </div>
    </div>
  )
}
