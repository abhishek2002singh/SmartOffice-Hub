import { useEffect, useState, useCallback } from 'react';
import { dmApi } from '../../../api/dm.api';
import { useSelector } from 'react-redux';
import {
  ChevronDown, ChevronRight, RefreshCw, Calendar,
  CheckCircle2, Circle, Clock, User, Hash, Palette,
} from 'lucide-react';
import dayjs from 'dayjs';
import GDCreateTaskModal from '../../gd/components/GDCreateTaskModal';

const PCT_COLOR = (pct) =>
  pct === 100 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400';

const PCT_BAR_COLOR = (pct) =>
  pct === 100 ? '#22C55E' : pct >= 60 ? '#EAB308' : '#EF4444';

export default function DMDailyDashboard() {
  const { user } = useSelector((s) => s.auth);
  const [dashboard, setDashboard] = useState([]);
  const [date,      setDate]      = useState(dayjs().format('YYYY-MM-DD'));
  const [loading,   setLoading]   = useState(true);
  const [logging,   setLogging]   = useState({}); // { key: true } for spinner
  const [collapsed, setCollapsed] = useState({}); // { clientId_platformId: bool }
  const [gdModal,   setGdModal]   = useState(null); // { clientId, clientName } when open

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await dmApi.getDailyDashboard(date);
      setDashboard(r.data.data.dashboard || []);
    } catch {} finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const toggleCollapse = (key) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const logTask = async ({ clientId, platformId, taskId, customFieldId, isCompleted, count, customValue }) => {
    const key = taskId || customFieldId;
    setLogging((prev) => ({ ...prev, [key]: true }));
    try {
      await dmApi.logTask({
        clientId, platformId,
        taskId: taskId || undefined,
        customFieldId: customFieldId || undefined,
        date,
        isCompleted,
        count: count ?? undefined,
        customValue: customValue ?? undefined,
      });
      // Optimistic update in dashboard state
      setDashboard((prev) =>
        prev.map((clientRow) => {
          if (clientRow.client._id !== clientId) return clientRow;
          return {
            ...clientRow,
            platforms: clientRow.platforms.map((pRow) => {
              if (pRow.mapping.platform._id !== platformId) return pRow;
              const updateItems = (items, idField) =>
                items.map((item) => {
                  const itemId = item[idField === 'task' ? 'task' : 'field']?._id;
                  if (itemId !== key) return item;
                  const newLog = { isCompleted, completedBy: { name: user?.name }, completedAt: new Date(), count, customValue };
                  return { ...item, isCompleted, log: newLog };
                });
              const newTasks   = updateItems(pRow.tasks, 'task');
              const newCFs     = updateItems(pRow.customFields, 'field');
              const completed  = newTasks.filter((t) => t.isCompleted).length + newCFs.filter((cf) => cf.isCompleted).length;
              const total      = pRow.total;
              return { ...pRow, tasks: newTasks, customFields: newCFs, completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
            }),
          };
        })
      );
    } catch {} finally {
      setLogging((prev) => ({ ...prev, [key]: false }));
    }
  };

  const totalClients   = dashboard.length;
  const totalPlatforms = dashboard.reduce((s, c) => s + c.platforms.length, 0);
  const totalTasks     = dashboard.reduce((s, c) => s + c.platforms.reduce((ps, p) => ps + p.total, 0), 0);
  const doneTasks      = dashboard.reduce((s, c) => s + c.platforms.reduce((ps, p) => ps + p.completed, 0), 0);
  const overallPct     = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">DM Daily Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Today's task checklist — Client × Platform × Tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#0A1628] border border-[#1A3A6B] rounded-lg px-3 py-2">
            <Calendar size={14} className="text-gray-400" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-sm text-white outline-none" />
          </div>
          <button onClick={load} className="p-2 text-gray-400 hover:text-white border border-[#1A3A6B] rounded-lg">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-6">
            <StatChip label="Clients" value={totalClients} color="text-[#00C6FF]" />
            <StatChip label="Platforms" value={totalPlatforms} color="text-purple-400" />
            <StatChip label="Tasks" value={`${doneTasks}/${totalTasks}`} color="text-white" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-[#1A3A6B] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${overallPct}%`, backgroundColor: PCT_BAR_COLOR(overallPct) }} />
            </div>
            <span className={`text-sm font-bold ${PCT_COLOR(overallPct)}`}>{overallPct}%</span>
          </div>
        </div>
      </div>

      {/* Dashboard */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Loading tasks...</div>
      ) : dashboard.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500 border border-[#1A3A6B] rounded-xl gap-2">
          <p className="text-sm">No platforms assigned to you for today.</p>
          <p className="text-xs">Contact your DM Head to get platforms assigned.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dashboard.map(({ client, platforms }) => (
            <div key={client._id} className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl overflow-hidden">
              {/* Client Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#1A3A6B] bg-[#1A3A6B]/20">
                <div>
                  <p className="text-white font-semibold">{client.companyName || client.name}</p>
                  <p className="text-gray-500 text-xs">{platforms.length} platform{platforms.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGdModal({ clientId: client._id, clientName: client.companyName || client.name })}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-[#1E6FD9]/50 text-[#00C6FF] hover:bg-[#1E6FD9]/10 transition-colors"
                    title="Create GD design task for this client"
                  >
                    <Palette size={12} /> GD Task
                  </button>
                  <ClientPct platforms={platforms} />
                </div>
              </div>

              {/* Platforms */}
              <div className="divide-y divide-[#1A3A6B]/40">
                {platforms.map((pRow) => {
                  const colKey   = `${client._id}_${pRow.mapping.platform._id}`;
                  const isOpen   = !collapsed[colKey];
                  const platform = pRow.mapping.platform;

                  return (
                    <div key={platform._id}>
                      {/* Platform Header */}
                      <button
                        onClick={() => toggleCollapse(colKey)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#1A3A6B]/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                          <span className="text-sm font-medium text-gray-200">{platform.name}</span>
                          <span className="text-xs text-gray-500">{pRow.completed}/{pRow.total}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-[#1A3A6B] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pRow.pct}%`, backgroundColor: PCT_BAR_COLOR(pRow.pct) }} />
                          </div>
                          <span className={`text-xs font-semibold ${PCT_COLOR(pRow.pct)}`}>{pRow.pct}%</span>
                        </div>
                      </button>

                      {/* Task List */}
                      {isOpen && (
                        <div className="px-5 pb-3 space-y-1">
                          {/* Standard Tasks */}
                          {pRow.tasks.map(({ task, log, isCompleted }) => (
                            <TaskRow
                              key={task._id}
                              label={task.title}
                              hasCount={task.hasCount}
                              isCompleted={isCompleted}
                              log={log}
                              logging={!!logging[task._id]}
                              onToggle={(count) => logTask({
                                clientId: client._id,
                                platformId: platform._id,
                                taskId: task._id,
                                isCompleted: !isCompleted,
                                count,
                              })}
                            />
                          ))}
                          {/* Custom Fields */}
                          {pRow.customFields.map(({ field, log, isCompleted }) => (
                            <CustomFieldRow
                              key={field._id}
                              field={field}
                              isCompleted={isCompleted}
                              log={log}
                              logging={!!logging[field._id]}
                              onSave={(value) => logTask({
                                clientId: client._id,
                                platformId: platform._id,
                                customFieldId: field._id,
                                isCompleted: true,
                                customValue: value,
                              })}
                            />
                          ))}
                          {pRow.tasks.length === 0 && pRow.customFields.length === 0 && (
                            <p className="text-gray-600 text-xs py-2">No tasks configured for this platform.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {gdModal && (
        <GDCreateTaskModal
          prefill={{ client: gdModal.clientId, sourceModule: 'dm' }}
          onClose={() => setGdModal(null)}
          onCreated={() => setGdModal(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatChip({ label, value, color }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ClientPct({ platforms }) {
  const total     = platforms.reduce((s, p) => s + p.total, 0);
  const completed = platforms.reduce((s, p) => s + p.completed, 0);
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">{completed}/{total}</span>
      <span className={`text-sm font-bold ${PCT_COLOR(pct)}`}>{pct}%</span>
    </div>
  );
}

function TaskRow({ label, hasCount, isCompleted, log, logging, onToggle }) {
  const [count, setCount] = useState(log?.count ?? '');
  const [editCount, setEditCount] = useState(false);

  const handleCheck = () => {
    if (hasCount && !isCompleted) {
      setEditCount(true);
    } else {
      onToggle(null);
    }
  };

  const submitCount = () => {
    onToggle(count !== '' ? Number(count) : null);
    setEditCount(false);
  };

  return (
    <div className={`flex items-start gap-3 py-1.5 px-2 rounded-lg hover:bg-[#1A3A6B]/10 group ${isCompleted ? 'opacity-75' : ''}`}>
      <button onClick={handleCheck} disabled={logging} className="mt-0.5 shrink-0">
        {logging ? (
          <div className="w-4 h-4 border-2 border-[#1E6FD9] border-t-transparent rounded-full animate-spin" />
        ) : isCompleted ? (
          <CheckCircle2 size={17} className="text-green-400" />
        ) : (
          <Circle size={17} className="text-gray-600 group-hover:text-gray-400" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <span className={`text-sm ${isCompleted ? 'line-through text-gray-500' : 'text-gray-300'}`}>{label}</span>

        {hasCount && editCount && (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number" value={count} onChange={(e) => setCount(e.target.value)}
              placeholder="Enter count" autoFocus
              className="w-28 bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#1E6FD9]"
            />
            <button onClick={submitCount} className="text-xs bg-[#1E6FD9] px-2 py-1 rounded text-white">Save</button>
            <button onClick={() => setEditCount(false)} className="text-xs text-gray-500 hover:text-white">Cancel</button>
          </div>
        )}

        {isCompleted && log && (
          <div className="flex items-center gap-2 mt-0.5">
            {log.count != null && <span className="text-xs text-[#00C6FF] flex items-center gap-0.5"><Hash size={10} />{log.count}</span>}
            {log.completedBy?.name && <span className="text-xs text-gray-600 flex items-center gap-0.5"><User size={10} />{log.completedBy.name}</span>}
            {log.completedAt && <span className="text-xs text-gray-600 flex items-center gap-0.5"><Clock size={10} />{new Date(log.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function CustomFieldRow({ field, isCompleted, log, logging, onSave }) {
  const [value, setValue] = useState(log?.customValue ?? '');
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-start gap-3 py-1.5 px-2 rounded-lg hover:bg-[#1A3A6B]/10 group">
      <button onClick={() => setEditing(true)} disabled={logging} className="mt-0.5 shrink-0">
        {logging ? (
          <div className="w-4 h-4 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        ) : isCompleted ? (
          <CheckCircle2 size={17} className="text-[#FF6B00]" />
        ) : (
          <Circle size={17} className="text-gray-600 group-hover:text-gray-400" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">{field.label}</span>
          <span className="text-xs text-[#FF6B00] bg-[#FF6B00]/10 px-1 py-0.5 rounded capitalize">{field.fieldType}</span>
          {field.isRequired && <span className="text-xs text-red-400">*</span>}
        </div>

        {editing ? (
          <div className="flex items-center gap-2 mt-1">
            {field.fieldType === 'dropdown' ? (
              <select value={value} onChange={(e) => setValue(e.target.value)}
                className="bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#1E6FD9]">
                <option value="">Select...</option>
                {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type={field.fieldType === 'number' ? 'number' : 'text'} value={value}
                onChange={(e) => setValue(e.target.value)} autoFocus
                className="w-40 bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#1E6FD9]" />
            )}
            <button onClick={() => { onSave(value); setEditing(false); }}
              className="text-xs bg-[#1E6FD9] px-2 py-1 rounded text-white">Save</button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-white">Cancel</button>
          </div>
        ) : isCompleted && log ? (
          <div className="flex items-center gap-2 mt-0.5">
            {log.customValue && <span className="text-xs text-[#FF6B00]">{log.customValue}</span>}
            {log.completedBy?.name && <span className="text-xs text-gray-600 flex items-center gap-0.5"><User size={10} />{log.completedBy.name}</span>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
