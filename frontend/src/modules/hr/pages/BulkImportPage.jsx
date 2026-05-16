import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { hrApi } from '../../../api/hr.api'

export default function BulkImportPage() {
  const navigate = useNavigate()
  const fileRef  = useRef(null)
  const [file, setFile]       = useState(null)
  const [result, setResult]   = useState(null)
  const [importing, setImporting] = useState(false)
  const [error, setError]     = useState('')

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setResult(null); setError('') }
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await hrApi.bulkImport(fd)
      setResult(r.data.data)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hr/candidates')} className="text-xs text-gray-500 hover:text-gray-300">← Back</button>
        <h1 className="text-xl font-bold text-white">Bulk Import Candidates</h1>
      </div>

      {/* Instructions */}
      <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">CSV / Excel Format</h2>
        <p className="text-xs text-gray-400">Columns required (header row must be present):</p>

        <div className="bg-[#1A3A6B] rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto whitespace-nowrap">
          firstName, lastName, phone, email, gender, appliedProfile, appliedFor, leadSource, totalExperience, expectedSalary, lastSalary, previousCompany, notes
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="rounded-lg p-3 space-y-1" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <p className="text-gray-300 font-medium mb-1">Valid values for each column:</p>
            <p className="text-gray-500"><span className="text-yellow-400">gender:</span> Male · Female · Other</p>
            <p className="text-gray-500"><span className="text-yellow-400">appliedProfile:</span> Sales · DM · GD · Development · HR · Admin</p>
            <p className="text-gray-500"><span className="text-yellow-400">appliedFor:</span> Full Time · Part Time · Internship · Freelance · WFH</p>
            <p className="text-gray-500"><span className="text-yellow-400">leadSource:</span> LinkedIn · Indeed · Internshala · Workindia · Walk-in · Reference · Others</p>
            <p className="text-green-600 mt-1">✓ Invalid values are auto-mapped to the closest option (e.g. "Naukri" → Others, "Software Engineer" → Development)</p>
          </div>
          <ul className="text-gray-500 space-y-0.5 list-disc list-inside">
            <li><span className="text-red-400">Required:</span> firstName, phone</li>
            <li>Duplicates (same phone or email) are skipped and reported</li>
            <li>Max file size: 5 MB · up to ~1,000 rows per import</li>
            <li>Supported: .csv · .xlsx · .xls</li>
          </ul>
        </div>

        {/* Download template with correct sample data */}
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(
            'firstName,lastName,phone,email,gender,appliedProfile,appliedFor,leadSource,totalExperience,expectedSalary,lastSalary,previousCompany,notes\n' +
            'Amit,Sharma,9876543210,amit.sharma@company.com,Male,Development,Full Time,LinkedIn,3,70000,60000,TechCorp,React developer\n' +
            'Priya,Singh,9988776655,priya.singh@company.com,Female,Sales,Full Time,Indeed,2,40000,35000,SalesCo,Good communication\n' +
            'Rahul,Verma,9998887776,rahul.verma@company.com,Male,DM,Full Time,Internshala,1,30000,,DigitalAgency,SEO knowledge\n' +
            'Neha,Gupta,9876541230,neha.gupta@company.com,Female,HR,Full Time,Reference,4,50000,45000,PeopleCorp,Payroll experience\n' +
            'Vikram,Patil,9988223344,,Male,GD,Internship,Workindia,0,15000,,, Graphic design student'
          )}`}
          download="candidates_template.csv"
          className="inline-flex items-center gap-2 text-xs text-[#1E6FD9] hover:text-[#00C6FF] border border-blue-800 rounded-lg px-4 py-2"
        >
          ↓ Download Sample CSV Template
        </a>
      </div>

      {/* Upload */}
      <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-5 space-y-4">
        <div
          className="border-2 border-dashed border-blue-800 rounded-xl p-8 text-center cursor-pointer hover:border-blue-600 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
          {file ? (
            <div>
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-400 text-sm">Click to select Excel or CSV file</p>
              <p className="text-xs text-gray-600 mt-1">.xlsx, .xls, .csv supported</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-2 text-sm">{error}</div>
        )}

        <button onClick={handleImport} disabled={!file || importing}
          className="w-full py-2.5 bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-40">
          {importing ? 'Importing...' : 'Start Import'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-[#0A1628] border border-green-900/50 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-white">Import Complete</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-900/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{result.inserted}</p>
              <p className="text-xs text-gray-400">Inserted</p>
            </div>
            <div className="bg-yellow-900/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">{result.duplicates?.length || 0}</p>
              <p className="text-xs text-gray-400">Duplicates Skipped</p>
            </div>
            <div className="bg-red-900/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{result.errors?.length || 0}</p>
              <p className="text-xs text-gray-400">Errors</p>
            </div>
          </div>

          {result.duplicates?.length > 0 && (
            <div>
              <p className="text-xs text-yellow-400 font-medium mb-2">Skipped Duplicates:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {result.duplicates.map((d, i) => (
                  <p key={i} className="text-xs text-gray-400">
                    {d.name} ({d.phone}) — already exists
                    {d.duplicateId && <button onClick={() => navigate(`/hr/candidates/${d.duplicateId}`)} className="ml-2 text-[#1E6FD9] hover:underline">View →</button>}
                  </p>
                ))}
              </div>
            </div>
          )}

          {result.errors?.length > 0 && (
            <div>
              <p className="text-xs text-red-400 font-medium mb-2">Errors:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-gray-400">Row {e.row}: {e.reason}</p>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => navigate('/hr/candidates')}
            className="w-full py-2 bg-[#1A3A6B] hover:bg-blue-800 text-white rounded-xl text-sm">
            View All Candidates →
          </button>
        </div>
      )}
    </div>
  )
}
