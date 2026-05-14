import { useEffect, useState } from 'react';
import { dmApi } from '../../../api/dm.api';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, GripVertical,
  Check, X, Settings, Tag, ToggleLeft, ToggleRight,
} from 'lucide-react';

export default function DMConfigPage() {
  const [platforms,      setPlatforms]      = useState([]);
  const [selectedP,      setSelectedP]      = useState(null); // active platform for task editing
  const [tasks,          setTasks]          = useState([]);
  const [customFields,   setCustomFields]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [taskLoading,    setTaskLoading]    = useState(false);

  // Platform form
  const [pForm,    setPForm]    = useState({ name: '', code: '', description: '' });
  const [pEditing, setPEditing] = useState(null);
  const [pOpen,    setPOpen]    = useState(false);

  // Task form
  const [tForm,    setTForm]    = useState({ title: '', hasCount: false });
  const [tEditing, setTEditing] = useState(null);

  // Custom field form
  const [cfForm,    setCfForm]    = useState({ label: '', fieldType: 'text', options: '', isRequired: false });
  const [cfEditing, setCfEditing] = useState(null);
  const [cfOpen,    setCfOpen]    = useState(false);

  const loadPlatforms = async () => {
    setLoading(true);
    try {
      const r = await dmApi.listPlatforms();
      setPlatforms(r.data.data.platforms);
    } catch {} finally { setLoading(false); }
  };

  const loadPlatformDetail = async (p) => {
    setSelectedP(p);
    setTaskLoading(true);
    setTEditing(null); setTForm({ title: '', hasCount: false });
    setCfEditing(null); setCfForm({ label: '', fieldType: 'text', options: '', isRequired: false });
    try {
      const [tr, cfr] = await Promise.all([
        dmApi.listTasks(p._id),
        dmApi.listCustomFields(p._id),
      ]);
      setTasks(tr.data.data.tasks);
      setCustomFields(cfr.data.data.fields);
    } catch {} finally { setTaskLoading(false); }
  };

  useEffect(() => { loadPlatforms(); }, []);

  // ── Platform CRUD ────────────────────────────────────────────────────────────
  const savePlatform = async () => {
    if (!pForm.name.trim() || !pForm.code.trim()) return;
    try {
      if (pEditing) {
        await dmApi.updatePlatform(pEditing._id, pForm);
      } else {
        await dmApi.createPlatform(pForm);
      }
      setPForm({ name: '', code: '', description: '' });
      setPEditing(null); setPOpen(false);
      loadPlatforms();
    } catch {}
  };

  const deletePlatform = async (p) => {
    if (!window.confirm(`Delete platform "${p.name}"? All tasks will be removed.`)) return;
    await dmApi.deletePlatform(p._id);
    if (selectedP?._id === p._id) setSelectedP(null);
    loadPlatforms();
  };

  const togglePlatform = async (p) => {
    await dmApi.updatePlatform(p._id, { isActive: !p.isActive });
    loadPlatforms();
    if (selectedP?._id === p._id) setSelectedP({ ...selectedP, isActive: !p.isActive });
  };

  // ── Task CRUD ────────────────────────────────────────────────────────────────
  const saveTask = async () => {
    if (!tForm.title.trim() || !selectedP) return;
    try {
      if (tEditing) {
        await dmApi.updateTask(selectedP._id, tEditing._id, tForm);
      } else {
        await dmApi.createTask(selectedP._id, { ...tForm, sortOrder: tasks.length });
      }
      setTForm({ title: '', hasCount: false }); setTEditing(null);
      const r = await dmApi.listTasks(selectedP._id);
      setTasks(r.data.data.tasks);
    } catch {}
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    await dmApi.deleteTask(selectedP._id, task._id);
    setTasks((prev) => prev.filter((t) => t._id !== task._id));
  };

  // ── Custom Field CRUD ────────────────────────────────────────────────────────
  const saveCF = async () => {
    if (!cfForm.label.trim() || !selectedP) return;
    const payload = {
      ...cfForm,
      options: cfForm.fieldType === 'dropdown' ? cfForm.options.split('\n').map((s) => s.trim()).filter(Boolean) : [],
    };
    try {
      if (cfEditing) {
        await dmApi.updateCustomField(selectedP._id, cfEditing._id, payload);
      } else {
        await dmApi.createCustomField(selectedP._id, payload);
      }
      setCfForm({ label: '', fieldType: 'text', options: '', isRequired: false }); setCfEditing(null); setCfOpen(false);
      const r = await dmApi.listCustomFields(selectedP._id);
      setCustomFields(r.data.data.fields);
    } catch {}
  };

  const deleteCF = async (cf) => {
    if (!window.confirm(`Delete custom field "${cf.label}"?`)) return;
    await dmApi.deleteCustomField(selectedP._id, cf._id);
    setCustomFields((prev) => prev.filter((f) => f._id !== cf._id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">DM Platform Config</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage platforms and daily task checklists</p>
        </div>
        <button
          onClick={() => { setPOpen(true); setPEditing(null); setPForm({ name: '', code: '', description: '' }); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1E6FD9] hover:bg-blue-600 text-white text-sm rounded-lg"
        >
          <Plus size={15} /> Add Platform
        </button>
      </div>

      {/* Platform Form Modal */}
      {pOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-white font-bold">{pEditing ? 'Edit Platform' : 'New Platform'}</h3>
            <div className="space-y-3">
              <input value={pForm.name} onChange={(e) => setPForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Platform name *" className="input-dm" />
              <input value={pForm.code} onChange={(e) => setPForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Code (e.g. FACEBOOK) *" className="input-dm" />
              <input value={pForm.description} onChange={(e) => setPForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)" className="input-dm" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setPOpen(false); setPEditing(null); }} className="px-4 py-2 text-sm text-gray-400 border border-[#1A3A6B] rounded-lg hover:text-white">Cancel</button>
              <button onClick={savePlatform} className="px-4 py-2 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Platform List */}
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold px-1">
            Platforms ({platforms.length})
          </p>
          {loading ? (
            <p className="text-gray-500 text-sm px-1">Loading...</p>
          ) : platforms.map((p) => (
            <div
              key={p._id}
              onClick={() => loadPlatformDetail(p)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                selectedP?._id === p._id
                  ? 'border-[#1E6FD9] bg-[#1E6FD9]/10'
                  : 'border-[#1A3A6B] bg-[#0A1628] hover:border-[#1E6FD9]/50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${p.isActive ? 'bg-green-400' : 'bg-gray-600'}`} />
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{p.name}</p>
                  <p className="text-gray-500 text-xs">{p.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => togglePlatform(p)} className="p-1 text-gray-500 hover:text-[#00C6FF]" title={p.isActive ? 'Deactivate' : 'Activate'}>
                  {p.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                </button>
                <button onClick={() => { setPEditing(p); setPForm({ name: p.name, code: p.code, description: p.description || '' }); setPOpen(true); }}
                  className="p-1 text-gray-500 hover:text-white"><Pencil size={13} /></button>
                <button onClick={() => deletePlatform(p)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Tasks + Custom Fields for selected platform */}
        <div className="lg:col-span-2 space-y-5">
          {!selectedP ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm border border-[#1A3A6B] rounded-xl">
              Select a platform to manage its tasks
            </div>
          ) : (
            <>
              {/* Tasks Section */}
              <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Daily Tasks — <span className="text-[#00C6FF]">{selectedP.name}</span>
                    <span className="text-gray-500 ml-2 font-normal">({tasks.length})</span>
                  </h3>
                </div>

                {/* Add/Edit Task Form */}
                <div className="flex gap-2">
                  <input
                    value={tForm.title}
                    onChange={(e) => setTForm((f) => ({ ...f, title: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && saveTask()}
                    placeholder="Task title (press Enter to save)"
                    className="input-dm flex-1"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-gray-400 whitespace-nowrap cursor-pointer">
                    <input type="checkbox" checked={tForm.hasCount}
                      onChange={(e) => setTForm((f) => ({ ...f, hasCount: e.target.checked }))}
                      className="accent-[#1E6FD9]" />
                    Has count
                  </label>
                  <button onClick={saveTask} className="px-3 py-1.5 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg shrink-0">
                    {tEditing ? 'Update' : 'Add'}
                  </button>
                  {tEditing && (
                    <button onClick={() => { setTEditing(null); setTForm({ title: '', hasCount: false }); }}
                      className="px-2 py-1.5 text-sm border border-[#1A3A6B] text-gray-400 hover:text-white rounded-lg">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {taskLoading ? (
                  <p className="text-gray-500 text-sm">Loading tasks...</p>
                ) : tasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">No tasks yet. Add the first task above.</p>
                ) : (
                  <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                    {tasks.map((task, i) => (
                      <div key={task._id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${tEditing?._id === task._id ? 'bg-[#1E6FD9]/10 border border-[#1E6FD9]/30' : 'hover:bg-[#1A3A6B]/20'}`}>
                        <span className="text-gray-600 text-xs w-5 text-right shrink-0">{i + 1}</span>
                        <span className="text-gray-300 text-sm flex-1">{task.title}</span>
                        {task.hasCount && <span className="text-xs text-[#00C6FF] bg-[#00C6FF]/10 px-1.5 py-0.5 rounded shrink-0">#</span>}
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setTEditing(task); setTForm({ title: task.title, hasCount: task.hasCount }); }}
                            className="p-1 text-gray-500 hover:text-white"><Pencil size={12} /></button>
                          <button onClick={() => deleteTask(task)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Fields Section */}
              <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Custom Fields — <span className="text-[#FF6B00]">{selectedP.name}</span>
                    <span className="text-gray-500 ml-2 font-normal">({customFields.length})</span>
                  </h3>
                  <button onClick={() => { setCfOpen(true); setCfEditing(null); setCfForm({ label: '', fieldType: 'text', options: '', isRequired: false }); }}
                    className="flex items-center gap-1 text-xs text-[#00C6FF] hover:text-white">
                    <Plus size={12} /> Add field
                  </button>
                </div>

                {cfOpen && (
                  <div className="border border-[#1A3A6B] rounded-lg p-4 space-y-3 bg-[#1A3A6B]/10">
                    <div className="grid grid-cols-2 gap-3">
                      <input value={cfForm.label} onChange={(e) => setCfForm((f) => ({ ...f, label: e.target.value }))}
                        placeholder="Field label *" className="input-dm" />
                      <select value={cfForm.fieldType} onChange={(e) => setCfForm((f) => ({ ...f, fieldType: e.target.value }))}
                        className="input-dm">
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="dropdown">Dropdown</option>
                      </select>
                    </div>
                    {cfForm.fieldType === 'dropdown' && (
                      <textarea value={cfForm.options} onChange={(e) => setCfForm((f) => ({ ...f, options: e.target.value }))}
                        placeholder="Options (one per line)" rows={3} className="input-dm w-full resize-none" />
                    )}
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                      <input type="checkbox" checked={cfForm.isRequired}
                        onChange={(e) => setCfForm((f) => ({ ...f, isRequired: e.target.checked }))}
                        className="accent-[#1E6FD9]" />
                      Required field
                    </label>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setCfOpen(false); setCfEditing(null); }} className="px-3 py-1.5 text-xs text-gray-400 border border-[#1A3A6B] rounded-lg hover:text-white">Cancel</button>
                      <button onClick={saveCF} className="px-3 py-1.5 text-xs bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg">Save</button>
                    </div>
                  </div>
                )}

                {customFields.length === 0 ? (
                  <p className="text-gray-500 text-sm">No custom fields. Add dynamic fields for this platform.</p>
                ) : (
                  <div className="space-y-1">
                    {customFields.map((cf) => (
                      <div key={cf._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1A3A6B]/20">
                        <Tag size={13} className="text-[#FF6B00] shrink-0" />
                        <span className="text-gray-300 text-sm flex-1">{cf.label}</span>
                        <span className="text-xs text-gray-500 capitalize">{cf.fieldType}</span>
                        {cf.isRequired && <span className="text-xs text-red-400">required</span>}
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => {
                            setCfEditing(cf);
                            setCfForm({ label: cf.label, fieldType: cf.fieldType, options: cf.options?.join('\n') || '', isRequired: cf.isRequired });
                            setCfOpen(true);
                          }} className="p-1 text-gray-500 hover:text-white"><Pencil size={12} /></button>
                          <button onClick={() => deleteCF(cf)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`.input-dm { background: rgba(26,58,107,0.2); border: 1px solid #1A3A6B; border-radius: 8px; padding: 8px 12px; font-size: 14px; color: white; outline: none; width: 100%; } .input-dm::placeholder { color: #6B7280; } .input-dm:focus { border-color: #1E6FD9; }`}</style>
    </div>
  );
}
