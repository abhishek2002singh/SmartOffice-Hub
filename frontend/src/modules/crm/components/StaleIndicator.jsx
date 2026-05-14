import { Clock } from 'lucide-react';

const THRESHOLDS = {
  new:         2  * 60 * 60 * 1000,
  contacted:   48 * 60 * 60 * 1000,
  qualified:   5  * 24 * 60 * 60 * 1000,
  proposal:    7  * 24 * 60 * 60 * 1000,
  negotiation: 3  * 24 * 60 * 60 * 1000,
};

export function isStale(lead) {
  const threshold = THRESHOLDS[lead.stage];
  if (!threshold) return false;
  return (Date.now() - new Date(lead.updatedAt).getTime()) > threshold;
}

export default function StaleIndicator({ lead, size = 12 }) {
  if (!isStale(lead)) return null;
  return (
    <span title="Stale — no activity for too long">
      <Clock size={size} className="text-orange-400" />
    </span>
  );
}
