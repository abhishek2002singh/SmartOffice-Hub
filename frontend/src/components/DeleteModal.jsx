import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * Reusable delete confirmation modal — AMS dark theme.
 * type='soft' : user types "DELETE"
 * type='hard' : user types "DELETE PERMANENTLY" + optional reason field
 */
export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  type = 'soft',
  title,
  message,
  itemName = '',
  requireReason = false,
  loading = false,
}) {
  const [confirmText, setConfirmText] = useState('')
  const [reason, setReason]           = useState('')

  useEffect(() => {
    if (isOpen) { setConfirmText(''); setReason('') }
  }, [isOpen])

  if (!isOpen) return null

  const isHard     = type === 'hard'
  const required   = isHard ? 'DELETE PERMANENTLY' : 'DELETE'
  const textMatch  = confirmText === required
  const reasonOk   = !requireReason || reason.trim().length >= 10
  const canSubmit  = textMatch && reasonOk && !loading

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md rounded-2xl shadow-2xl"
        style={{ backgroundColor: '#0A1628', border: '1px solid rgba(239,68,68,0.4)' }}>

        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-red-900/30">
          <div className={`p-2 rounded-full shrink-0 ${isHard ? 'bg-red-900/50' : 'bg-orange-900/50'}`}>
            <AlertTriangle size={20} className={isHard ? 'text-red-400' : 'text-orange-400'} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base">{title}</h3>
            <p className="text-gray-400 text-sm mt-1">{message}</p>
            {itemName && (
              <p className="text-white text-sm font-medium mt-1.5 truncate">
                &quot;{itemName}&quot;
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Warning banner for hard delete */}
          {isHard && (
            <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <p className="text-red-400 font-medium mb-0.5">Permanent action — cannot be undone</p>
              <p className="text-red-300/70">Record will be permanently removed from the database. Audit log entry will be preserved.</p>
            </div>
          )}

          {/* Reason (hard delete only when requireReason=true) */}
          {requireReason && (
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">
                Reason for permanent deletion <span className="text-red-400">(min 10 chars)</span>
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="State the reason..."
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none resize-none"
                style={{ backgroundColor: '#1A3A6B', border: '1px solid rgba(30,111,217,0.4)' }}
              />
              <p className="text-xs text-gray-600 mt-0.5">{reason.trim().length} / 10 minimum</p>
            </div>
          )}

          {/* Confirm text */}
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">
              Type <span className="font-mono text-red-300 bg-red-900/30 px-1.5 py-0.5 rounded">{required}</span> to confirm
            </label>
            <input
              autoFocus
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canSubmit && onConfirm({ confirmText, reason })}
              placeholder={required}
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none font-mono"
              style={{ backgroundColor: '#1A3A6B', border: `1px solid ${textMatch ? 'rgba(239,68,68,0.6)' : 'rgba(30,111,217,0.4)'}` }}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg text-sm text-gray-300 border border-blue-900 hover:bg-white/5 disabled:opacity-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => onConfirm({ confirmText, reason })}
              disabled={!canSubmit}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40 ${
                isHard ? 'bg-red-700 hover:bg-red-600' : 'bg-orange-700 hover:bg-orange-600'
              }`}
            >
              {loading ? 'Processing...' : isHard ? 'Delete Permanently' : 'Archive'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
