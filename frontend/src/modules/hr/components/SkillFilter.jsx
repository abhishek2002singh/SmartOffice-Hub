import { useState, useRef, useEffect } from 'react'
import { Search, Check, ChevronDown } from 'lucide-react'

const SKILL_CATALOG = {
  Sales: [
    'Communication', 'Lead Generation', 'Client Conversion', 'Computer Skills',
    'Negotiation', 'Convincing', 'Problem Solving', 'Cold Calling',
    'Presentation Skills', 'CRM Tools', 'Follow-up',
  ],
  DM: [
    'Facebook Marketing', 'Instagram Marketing', 'Twitter Marketing',
    'LinkedIn Marketing', 'YouTube Marketing', 'Threads',
    'SEO On-Page', 'SEO Off-Page', 'SEO Technical',
    'Meta Ads', 'Google Ads', 'LinkedIn Ads',
    'GMB', 'Content Writing', 'AI Tools', 'Google Analytics',
    'Influencer Marketing', 'Email Marketing',
    'Amazon', 'Flipkart', 'Meesho', 'Myntra',
  ],
  GD: [
    'Photoshop', 'Premiere Pro', 'After Effects', 'CorelDraw', 'Illustrator',
    'CapCut', 'Final Cut Pro', 'Canva', '2D Animation', '3D Animation',
    'AI Image Generation', 'AI Video Generation', 'Logo Design',
    'UI/UX Design', 'Motion Graphics',
  ],
  Development: [
    'HTML', 'CSS', 'JavaScript', 'React', 'WordPress', 'jQuery',
    'Bootstrap', 'React Native', 'Tailwind CSS', 'Flutter', 'Three.js',
    'Next.js', 'Express', 'Node.js', 'PHP', 'Python',
    'MySQL', 'MongoDB', 'SQL', 'PostgreSQL',
    'Shopify', 'WooCommerce',
    'Git', 'GitHub', 'Postman', 'AWS', 'Docker', 'Kubernetes',
  ],
  HR: [
    'Recruitment', 'JD Writing', 'Interviewing', 'HR Documentation',
    'Communication', 'Policy Creation', 'Resume Screening',
    'Decision Making', 'Attendance Management', 'Payroll Processing',
  ],
}

const ALL_SKILLS = [...new Set(Object.values(SKILL_CATALOG).flat())].sort()

export default function SkillFilter({ selectedSkills = [], onChange, profile = '' }) {
  const [open, setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const available = (profile && SKILL_CATALOG[profile]) ? SKILL_CATALOG[profile] : ALL_SKILLS
  const filtered   = available.filter(s => s.toLowerCase().includes(search.toLowerCase()))

  const toggleSkill = (skill) => {
    const updated = selectedSkills.includes(skill)
      ? selectedSkills.filter(s => s !== skill)
      : [...selectedSkills, skill]
    onChange(updated)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        className="flex items-center gap-2 px-4 py-2 bg-[#1A3A6B] border border-blue-800 rounded-lg text-sm text-white hover:bg-blue-900/60 transition-colors"
      >
        <span>Skills</span>
        {selectedSkills.length > 0 && (
          <span className="bg-[#1E6FD9] text-white text-xs px-2 py-0.5 rounded-full font-medium min-w-[20px] text-center">
            {selectedSkills.length}
          </span>
        )}
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-72 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{ backgroundColor: '#0A1628', border: '1px solid rgba(30,111,217,0.5)' }}
        >
          {/* Search */}
          <div className="p-3" style={{ borderBottom: '1px solid rgba(30,111,217,0.25)' }}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                autoFocus
                type="text"
                placeholder="Search skills..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none"
                style={{ backgroundColor: '#1A3A6B', border: '1px solid rgba(30,111,217,0.4)' }}
              />
            </div>
          </div>

          {/* Skill list */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No skills found</div>
            ) : (
              filtered.map(skill => {
                const isSelected = selectedSkills.includes(skill)
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-white/5 transition-colors"
                  >
                    <div className={`w-4 h-4 rounded shrink-0 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-[#1E6FD9]' : 'border border-blue-700'
                    }`}>
                      {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className={isSelected ? 'text-white font-medium' : 'text-gray-300'}>{skill}</span>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div
            className="p-2 flex justify-between items-center"
            style={{ borderTop: '1px solid rgba(30,111,217,0.25)', backgroundColor: '#070f1e' }}
          >
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={selectedSkills.length === 0}
              className="text-xs px-3 py-1.5 rounded text-red-400 hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Clear ({selectedSkills.length})
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setSearch('') }}
              className="text-xs px-4 py-1.5 rounded-lg bg-[#1E6FD9] hover:bg-blue-600 text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
