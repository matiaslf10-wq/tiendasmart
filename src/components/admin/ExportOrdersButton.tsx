import type { RangeValue } from '@/lib/admin/orders';

type ExportOrdersButtonProps = {
  range: RangeValue;
};

export default function ExportOrdersButton({
  range,
}: ExportOrdersButtonProps) {
  const href = `/api/admin/export/orders?range=${encodeURIComponent(range)}`;

  return (
    <a
      href={href}
      className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-50"
    >
      Exportar CSV
    </a>
  );
}