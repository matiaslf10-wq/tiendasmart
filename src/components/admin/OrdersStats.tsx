type Props = {
  orders: any[];
};

export default function OrdersStats({ orders }: Props) {
  const total = orders.length;
  const pending = orders.filter((o) => o.status === 'pending').length;
  const preparing = orders.filter((o) => o.status === 'in_preparation').length;
  const delivered = orders.filter((o) => o.status === 'delivered').length;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card label="Total" value={total} />
      <Card label="Pendientes" value={pending} />
      <Card label="En preparación" value={preparing} />
      <Card label="Entregados" value={delivered} />
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}