export default function LeadScoreBadge({ score, heat }) {
  const h = heat || (score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold');
  const config = {
    hot:  { label: 'Hot',  dot: 'bg-red-500',    text: 'text-red-400' },
    warm: { label: 'Warm', dot: 'bg-yellow-500',  text: 'text-yellow-400' },
    cold: { label: 'Cold', dot: 'bg-blue-500',    text: 'text-blue-400' },
  };
  const { label, dot, text } = config[h] || config.cold;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label} {score != null && <span className="text-gray-500">· {score}</span>}
    </span>
  );
}
