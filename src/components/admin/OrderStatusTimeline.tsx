type OrderStatusEvent = {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by?: string | null;
  note?: string | null;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusLabel(status: string | null) {
  if (!status) return 'Inicio';

  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'confirmed':
      return 'Confirmado';
    case 'in_preparation':
      return 'En preparación';
    case 'ready':
      return 'Listo';
    case 'delivered':
      return 'Entregado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}

export default function OrderStatusTimeline({
  events,
}: {
  events: OrderStatusEvent[];
}) {
  if (!events || events.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Todavía no hay movimientos registrados.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="rounded-2xl border border-gray-200 bg-white p-4"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">
                {getStatusLabel(event.from_status)} →{' '}
                {getStatusLabel(event.to_status)}
              </p>

              {event.changed_by ? (
                <p className="text-xs text-gray-500">
                  Cambiado por: {event.changed_by}
                </p>
              ) : null}

              {event.note ? (
                <p className="mt-2 text-sm text-gray-600">{event.note}</p>
              ) : null}
            </div>

            <p className="shrink-0 text-xs text-gray-400">
              {formatDate(event.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}