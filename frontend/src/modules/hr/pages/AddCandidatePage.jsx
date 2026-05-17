import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hrApi } from '../../../api/hr.api'
import api from '../../../api/axios'

const STEPS = ['Personal', 'Background', 'Application', 'Skills']

const PROFILES   = ['Sales', 'DM', 'GD', 'Development', 'HR', 'Admin']
const FOR_TYPES  = ['Internship', 'Full Time', 'Part Time', 'Freelance', 'WFH']
const SOURCES    = ['Internshala', 'Workindia', 'Indeed', 'LinkedIn', 'Walk-in', 'Reference', 'Others']
const GENDERS    = ['Male', 'Female', 'Other']
const MARITAL    = ['Married', 'Unmarried', 'Other']
const PRIORITIES = ['High', 'Medium', 'Low']
const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Expert']

function StepIndicator({ step, total }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
            ${i < step ? 'bg-green-600 text-white' : i === step ? 'bg-[#1E6FD9] text-white' : 'bg-[#1A3A6B] text-gray-400'}`}>
            {i < step ? '✓' : i + 1}
          </div>
          <span className={`text-xs hidden md:inline ${i === step ? 'text-white' : 'text-gray-500'}`}>{s}</span>
          {i < total - 1 && <div className={`w-6 h-px ${i < step ? 'bg-green-600' : 'bg-gray-700'}`} />}
        </div>
      ))}
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}

const INPUT = "w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500"
const SELECT = "w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm"

export default function AddCandidatePage() {
  const navigate = useNavigate()
  const { id }   = useParams()           // present when editing
  const isEdit   = Boolean(id)

  const [step, setStep]       = useState(0)
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError]     = useState('')
  const [dupInfo, setDupInfo] = useState(null)
  const [skillMatrix, setSkillMatrix] = useState([])
  const [allDepts, setAllDepts] = useState([])

  const [form, setForm] = useState({
    firstName: '', middleName: '', lastName: '',
    dob: '', gender: 'Male', maritalStatus: 'Unmarried',
    phone: '', altPhone: '', email: '', address: '',
    languagesKnown: '',
    education: '', lastSalary: '', previousCompany: '',
    previousProfile: '', totalExperience: '0', expectedSalary: '',
    appliedProfile: 'Sales', appliedFor: 'Full Time',
    leadSource: 'Others', referenceName: '',
    priority: 'Medium', callingStatus: 'Not Called', notes: '',
    cvLink: '', portfolioLink: '',
    selectedSkills: [],
  })

  // Pre-fill form when editing
  useEffect(() => {
    if (!isEdit) return
    hrApi.getCandidate(id).then(r => {
      const c = r.data.data.candidate
      setForm({
        firstName:       c.firstName       || '',
        middleName:      c.middleName      || '',
        lastName:        c.lastName        || '',
        dob:             c.dob ? c.dob.slice(0, 10) : '',
        gender:          c.gender          || 'Male',
        maritalStatus:   c.maritalStatus   || 'Unmarried',
        phone:           c.phone           || '',
        altPhone:        c.altPhone        || '',
        email:           c.email           || '',
        address:         c.address         || '',
        languagesKnown:  (c.languagesKnown || []).join(', '),
        education:       c.education       || '',
        lastSalary:      c.lastSalary      != null ? String(c.lastSalary) : '',
        previousCompany: c.previousCompany || '',
        previousProfile: c.previousProfile || '',
        totalExperience: String(c.totalExperience ?? 0),
        expectedSalary:  c.expectedSalary  != null ? String(c.expectedSalary) : '',
        appliedProfile:  c.appliedProfile  || 'Sales',
        appliedFor:      c.appliedFor      || 'Full Time',
        leadSource:      c.leadSource      || 'Others',
        referenceName:   c.referenceName   || '',
        priority:        c.priority        || 'Medium',
        callingStatus:   c.callingStatus   || 'Not Called',
        notes:           c.notes           || '',
        cvLink:          c.cvLink          || '',
        portfolioLink:   c.portfolioLink   || '',
        selectedSkills:  c.skills          || [],
      })
    }).catch(() => setError('Failed to load candidate'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  // Load departments once
  useEffect(() => {
    api.get('/departments').then(r => setAllDepts(r.data?.data?.departments || [])).catch(() => {})
  }, [])

  // Load skill matrix from department when profile changes
  useEffect(() => {
    const profile = form.appliedProfile.toLowerCase()
    const dept = allDepts.find(d =>
      d.name.toLowerCase().includes(profile) ||
      d.code.toLowerCase() === profile ||
      d.code.toLowerCase().startsWith(profile.slice(0, 3))
    )
    if (dept?.skills?.length) {
      setSkillMatrix(dept.skills)
    } else {
      // Fallback to HRConfig skill matrices
      hrApi.getConfig().then(r => {
        const matrices = r.data.data.config?.skillMatrices
        if (matrices) {
          const matrix = matrices[form.appliedProfile] || []
          setSkillMatrix(Array.isArray(matrix) ? matrix : Object.values(matrix))
        }
      }).catch(() => {})
    }
  }, [form.appliedProfile, allDepts])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleSkill = (skillName) => {
    setForm(f => {
      const existing = f.selectedSkills.find(s => s.skill === skillName)
      if (existing) {
        return { ...f, selectedSkills: f.selectedSkills.filter(s => s.skill !== skillName) }
      }
      return { ...f, selectedSkills: [...f.selectedSkills, { skill: skillName, proficiency: 'Beginner' }] }
    })
  }

  const setSkillProficiency = (skillName, proficiency) => {
    setForm(f => ({
      ...f,
      selectedSkills: f.selectedSkills.map(s => s.skill === skillName ? { ...s, proficiency } : s),
    }))
  }

  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1))
  const prev = () => setStep(s => Math.max(0, s - 1))

  const handleSubmit = async (overrideDuplicate = false) => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        dob:             form.dob || undefined,
        lastSalary:      form.lastSalary ? +form.lastSalary : undefined,
        expectedSalary:  form.expectedSalary ? +form.expectedSalary : undefined,
        totalExperience: +form.totalExperience || 0,
        languagesKnown:  form.languagesKnown.split(',').map(l => l.trim()).filter(Boolean),
        skills:          form.selectedSkills,
        overrideDuplicate,
      }
      delete payload.selectedSkills

      if (isEdit) {
        await hrApi.updateCandidate(id, payload)
        navigate(`/hr/candidates/${id}`)
      } else {
        const r = await hrApi.createCandidate(payload)
        navigate(`/hr/candidates/${r.data.data.candidate._id}`)
      }
    } catch (err) {
      if (err.response?.data?.error?.code === 'DUPLICATE_CANDIDATE') {
        setDupInfo(err.response.data.error)
      } else {
        setError(err.response?.data?.error?.message || (isEdit ? 'Failed to update candidate' : 'Failed to create candidate'))
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      {loading && <div className="text-center py-12 text-gray-500">Loading...</div>}
      {!loading && <>
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(isEdit ? `/hr/candidates/${id}` : '/hr/candidates')} className="text-xs text-gray-500 hover:text-gray-300">
          ← Back
        </button>
        <h1 className="text-xl font-bold text-white">{isEdit ? 'Edit Candidate' : 'Add Candidate'}</h1>
      </div>

      <StepIndicator step={step} total={STEPS.length} />

      <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-2 text-sm mb-4">{error}</div>
        )}

        {/* Duplicate warning */}
        {dupInfo && (
          <div className="bg-orange-900/30 border border-orange-800 rounded-lg p-4 mb-4 space-y-3">
            <p className="text-orange-300 text-sm font-medium">Duplicate Detected</p>
            <p className="text-sm text-gray-300">
              A candidate with the same phone/email already exists: <strong>{dupInfo.duplicateName}</strong>
            </p>
            <div className="flex gap-2">
              <button onClick={() => navigate(`/hr/candidates/${dupInfo.duplicateId}`)}
                className="text-xs px-3 py-1.5 border border-orange-700 text-orange-300 rounded-lg hover:bg-orange-900/40">
                View Existing
              </button>
              <button onClick={() => handleSubmit(true)}
                className="text-xs px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white rounded-lg">
                Add Anyway (Override)
              </button>
              <button onClick={() => setDupInfo(null)} className="text-xs text-gray-400 hover:text-white px-2">Cancel</button>
            </div>
          </div>
        )}

        {/* Step 0: Personal */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">Personal Information</h2>
            <div className="grid grid-cols-3 gap-3">
              <Field label="First Name" required><input value={form.firstName} onChange={e => set('firstName', e.target.value)} className={INPUT} placeholder="Rahul" /></Field>
              <Field label="Middle Name"><input value={form.middleName} onChange={e => set('middleName', e.target.value)} className={INPUT} /></Field>
              <Field label="Last Name"><input value={form.lastName} onChange={e => set('lastName', e.target.value)} className={INPUT} placeholder="Sharma" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" required><input value={form.phone} onChange={e => set('phone', e.target.value)} className={INPUT} placeholder="9999999999" /></Field>
              <Field label="Alt Phone"><input value={form.altPhone} onChange={e => set('altPhone', e.target.value)} className={INPUT} /></Field>
              <Field label="Email"><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={INPUT} placeholder="rahul@email.com" /></Field>
              <Field label="Date of Birth"><input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} className={INPUT} /></Field>
              <Field label="Gender" required>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className={SELECT}>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Marital Status">
                <select value={form.maritalStatus} onChange={e => set('maritalStatus', e.target.value)} className={SELECT}>
                  {MARITAL.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Address"><textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} className={INPUT} /></Field>
            <Field label="Languages Known (comma-separated)">
              <input value={form.languagesKnown} onChange={e => set('languagesKnown', e.target.value)} className={INPUT} placeholder="Hindi, English, Punjabi" />
            </Field>
          </div>
        )}

        {/* Step 1: Background */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">Work Background</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Total Experience (years)">
                <input type="number" min="0" step="0.5" value={form.totalExperience} onChange={e => set('totalExperience', e.target.value)} className={INPUT} />
              </Field>
              <Field label="Previous Company"><input value={form.previousCompany} onChange={e => set('previousCompany', e.target.value)} className={INPUT} /></Field>
              <Field label="Previous Profile/Role"><input value={form.previousProfile} onChange={e => set('previousProfile', e.target.value)} className={INPUT} /></Field>
              <Field label="Education"><input value={form.education} onChange={e => set('education', e.target.value)} className={INPUT} placeholder="B.Com, MBA..." /></Field>
              <Field label="Last Salary (₹/month)"><input type="number" value={form.lastSalary} onChange={e => set('lastSalary', e.target.value)} className={INPUT} /></Field>
              <Field label="Expected Salary (₹/month)"><input type="number" value={form.expectedSalary} onChange={e => set('expectedSalary', e.target.value)} className={INPUT} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CV / Resume Link (Google Drive)">
                <input value={form.cvLink} onChange={e => set('cvLink', e.target.value)} className={INPUT} placeholder="https://drive.google.com/..." />
              </Field>
              <Field label="Portfolio Link (for GD/Dev)">
                <input value={form.portfolioLink} onChange={e => set('portfolioLink', e.target.value)} className={INPUT} placeholder="https://..." />
              </Field>
            </div>
          </div>
        )}

        {/* Step 2: Application */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">Application Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Applied For Profile" required>
                <select value={form.appliedProfile} onChange={e => set('appliedProfile', e.target.value)} className={SELECT}>
                  {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Employment Type" required>
                <select value={form.appliedFor} onChange={e => set('appliedFor', e.target.value)} className={SELECT}>
                  {FOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Lead Source" required>
                <select value={form.leadSource} onChange={e => set('leadSource', e.target.value)} className={SELECT}>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              {form.leadSource === 'Reference' && (
                <Field label="Reference Name"><input value={form.referenceName} onChange={e => set('referenceName', e.target.value)} className={INPUT} /></Field>
              )}
              <Field label="Priority">
                <select value={form.priority} onChange={e => set('priority', e.target.value)} className={SELECT}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Calling Status">
                <select value={form.callingStatus} onChange={e => set('callingStatus', e.target.value)} className={SELECT}>
                  {['Not Called', 'Ringing', 'Busy', 'Not Connected', 'Rejected', 'Switched Off', 'Connected'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notes">
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={INPUT} placeholder="Any additional notes..." />
            </Field>
          </div>
        )}

        {/* Step 3: Skills */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">
              Skills — {form.appliedProfile}
              <span className="text-sm font-normal text-gray-500 ml-2">(select applicable)</span>
            </h2>

            {skillMatrix.length === 0 ? (
              <p className="text-gray-500 text-sm">No skill matrix configured for this profile.</p>
            ) : (
              (() => {
                const grouped = {}
                skillMatrix.forEach(s => {
                  const cat = s.category || 'General'
                  if (!grouped[cat]) grouped[cat] = []
                  grouped[cat].push(s)
                })
                return Object.entries(grouped).map(([cat, skills]) => (
                  <div key={cat}>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{cat}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {skills.map(s => {
                        const selected = form.selectedSkills.find(sk => sk.skill === s.name)
                        return (
                          <div key={s.name} className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleSkill(s.name)}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                selected
                                  ? 'border-[#1E6FD9] bg-[#1E6FD9] text-white'
                                  : 'border-blue-900 text-gray-400 hover:border-blue-600 hover:text-white'
                              }`}
                            >
                              {s.name}
                            </button>
                            {selected && (
                              <select
                                value={selected.proficiency}
                                onChange={e => setSkillProficiency(s.name, e.target.value)}
                                className="text-xs bg-[#1A3A6B] border border-blue-800 rounded px-1 py-0.5 text-white"
                              >
                                {PROFICIENCY_LEVELS.map(p => <option key={p} value={p}>{p[0]}</option>)}
                              </select>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              })()
            )}

            {form.selectedSkills.length > 0 && (
              <div className="bg-[#1A3A6B] rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-2">Selected ({form.selectedSkills.length} skills):</p>
                <div className="flex flex-wrap gap-1.5">
                  {form.selectedSkills.map(s => (
                    <span key={s.skill} className="text-xs bg-[#1E6FD9] text-white px-2 py-0.5 rounded-full">
                      {s.skill} · {s.proficiency}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={prev} disabled={step === 0}
          className="px-5 py-2.5 bg-[#1A3A6B] text-white rounded-xl text-sm disabled:opacity-40">
          ← Previous
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={next} disabled={step === 0 && !form.firstName.trim()}
            className="px-5 py-2.5 bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-40">
            Next →
          </button>
        ) : (
          <button onClick={() => handleSubmit(false)} disabled={saving}
            className="px-6 py-2.5 bg-green-700 hover:bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Candidate'}
          </button>
        )}
      </div>
      </>}
    </div>
  )
}
