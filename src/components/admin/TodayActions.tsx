import type { TodayAction } from '@/lib/admin/today-actions';

type Props = {
  actions: TodayAction[];
};

function toneClasses(tone: TodayAction['tone']) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-950';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-950';
    case 'danger':
      return 'border-rose-200 bg-rose-50 text-rose-950';
    case 'info':
    default:
      return 'border-slate-200 bg-slate-50 text-slate-900';
  }
}

function toneLabel(tone: TodayAction['tone']) {
  switch (tone) {
    case 'success':
      return 'Oportunidad';
    case 'warning':
      return 'Atención';
    case 'danger':
      return 'Prioridad';
    case 'info':
    default:
      return 'Info';
  }
}

export default function TodayActions({ actions }: Props) {
  if (!actions.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Qué hacer hoy</h2>
        <p className="text-sm text-slate-600">
          Prioridades automáticas sugeridas a partir del rendimiento reciente de la tienda.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {actions.map((action, index) => (
          <article
            key={action.id}
            className={`rounded-2xl border p-4 ${toneClasses(action.tone)}`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                  Prioridad {index + 1}
                </p>
                <h3 className="mt-1 text-sm font-semibold">{action.title}</h3>
              </div>

              <span className="rounded-full border border-current/20 px-2.5 py-1 text-xs font-medium">
                {toneLabel(action.tone)}
              </span>
            </div>

            <p className="text-sm leading-6">{action.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}