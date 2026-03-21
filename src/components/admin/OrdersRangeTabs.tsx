import Link from 'next/link';

type RangeValue = 'today' | '7d' | '30d' | 'month' | 'all';

type Props = {
  currentRange: RangeValue;
  status: string;
  queryText: string;
  delivery: string;
  notes: string;
};

const RANGES: Array<{ value: RangeValue; label: string }> = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'month', label: 'Este mes' },
  { value: 'all', label: 'Todo' },
];

function buildHref(params: {
  range: RangeValue;
  status: string;
  queryText: string;
  delivery: string;
  notes: string;
}) {
  const search = new URLSearchParams();

  if (params.range !== 'all') {
    search.set('range', params.range);
  }

  if (params.status !== 'all') {
    search.set('status', params.status);
  }

  if (params.queryText.trim()) {
    search.set('q', params.queryText.trim());
  }

  if (params.delivery !== 'all') {
    search.set('delivery', params.delivery);
  }

  if (params.notes !== 'all') {
    search.set('notes', params.notes);
  }

  const queryString = search.toString();
  return queryString ? `/admin/pedidos?${queryString}` : '/admin/pedidos';
}

export default function OrdersRangeTabs({
  currentRange,
  status,
  queryText,
  delivery,
  notes,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {RANGES.map((range) => {
        const isActive = currentRange === range.value;

        return (
          <Link
            key={range.value}
            href={buildHref({
              range: range.value,
              status,
              queryText,
              delivery,
              notes,
            })}
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-black text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {range.label}
          </Link>
        );
      })}
    </div>
  );
}