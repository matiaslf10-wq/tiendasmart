import type { RangeValue } from '@/lib/admin/orders';

type ExportOrdersDetailedButtonProps = {
  range: RangeValue;
};

export default function ExportOrdersDetailedButton({
  range,
}: ExportOrdersDetailedButtonProps) {
  const href = `/api/admin/export/orders-detailed?range=${encodeURIComponent(range)}`;

  return (
    <a
      href={href}
      className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
    >
      Exportar detalle CSV
    </a>
  );
}