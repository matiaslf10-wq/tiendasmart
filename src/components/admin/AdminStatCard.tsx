type AdminStatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'default' | 'success' | 'warning';
};

function getToneClasses(tone: AdminStatCardProps['tone']) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-950';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-950';
    default:
      return 'border-gray-200 bg-white text-gray-900';
  }
}

export default function AdminStatCard({
  label,
  value,
  helper,
  tone = 'default',
}: AdminStatCardProps) {
  return (
    <article
      className={`rounded-3xl border p-5 shadow-sm ${getToneClasses(tone)}`}
    >
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-3 text-3xl font-bold leading-none">{value}</p>
      {helper ? <p className="mt-3 text-xs opacity-75">{helper}</p> : null}
    </article>
  );
}