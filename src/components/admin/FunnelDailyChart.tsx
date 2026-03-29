'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { FunnelDailyPoint } from '@/lib/admin/funnel-daily-series';

type Props = {
  points: FunnelDailyPoint[];
};

function formatDateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}`;
}

export default function FunnelDailyChart({ points }: Props) {
  if (!points.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Evolución diaria del funnel propio
        </h3>
        <p className="text-sm text-slate-600">
          Tendencia por día de vistas, carrito, checkout, WhatsApp, contactos y ventas.
        </p>
      </div>

      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              minTickGap={24}
            />
            <YAxis allowDecimals={false} />
            <Tooltip
              labelFormatter={(value) => `Fecha: ${formatDateLabel(String(value))}`}
            />
            <Line type="monotone" dataKey="views" name="Views" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="addToCart" name="Carrito" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="checkout" name="Checkout" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="whatsapp" name="WhatsApp" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="contactWhatsapp" name="Contactos" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="purchases" name="Ventas" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}