'use client';

import { useId, useRef } from 'react';

type Guide = { title: string; description: string; steps: string[]; note?: string };

const guides: Record<string, Guide> = {
  instagram_bio: {
    title: 'Cómo usar el link en Instagram',
    description: 'Ponelo en el perfil para medir las visitas que llegan desde tu bio.',
    steps: [
      'Copiá el link de Instagram bio completo.',
      'En Instagram, desde el celular, entrá a tu perfil → Editar perfil → Enlaces → Agregar enlace externo.',
      'Pegalo en URL, elegí un título como “Comprar en nuestra tienda” y guardá.',
      'Pedile a alguien que entre a tu perfil y abra el enlace para probarlo.',
    ],
    note: 'Para distinguir una historia del perfil, generá otro enlace con un identificador diferente, por ejemplo instagram_historia.',
  },
  qr_local: {
    title: 'Cómo usar un QR en tu local',
    description: 'Un QR permite abrir tu tienda al escanear un cartel con el celular.',
    steps: [
      'Copiá el link QR local completo.',
      'Convertí ese enlace en QR. En Chrome podés abrirlo y buscar “Crear código QR” en el menú de compartir.',
      'Descargá la imagen y colocala en un cartel del mostrador, la vidriera o una mesa.',
      'Antes de imprimir, escanealo con otro celular y comprobá que abra tu tienda.',
    ],
    note: 'El QR debe contener el enlace completo, con sus etiquetas. Este botón explica los pasos; no genera una imagen QR.',
  },
  flyer_impreso: {
    title: 'Cómo usar el link en un flyer',
    description: 'Identificá las visitas que llegan desde tus folletos impresos.',
    steps: [
      'Copiá el link Flyer completo.',
      'Convertí ese enlace en QR desde el menú de compartir de Chrome o desde la herramienta de diseño que uses.',
      'Insertá la imagen QR en el flyer y agregá una invitación como “Escaneá y conocé nuestros productos”.',
      'Probá el QR en el tamaño en que vas a imprimirlo y confirmá que abra la tienda.',
    ],
    note: 'Si querés comparar dos flyers, creá un identificador distinto para cada diseño. El mismo QR reúne sus visitas bajo la misma etiqueta.',
  },
  meta_ads: {
    title: 'Cómo usar el link en una campaña Meta',
    description: 'Usalo como destino de un anuncio que lleve a tu tienda.',
    steps: [
      'Copiá el link Campaña Meta completo.',
      'En el Administrador de anuncios de Meta, prepará un anuncio cuyo destino sea un sitio web.',
      'Pegá el enlace en el campo de URL del sitio web o destino del anuncio.',
      'Revisá la vista previa y abrí el enlace para comprobar el destino antes de publicar.',
    ],
    note: 'Este enlace no crea ni publica anuncios. El presupuesto y la publicación se gestionan en Meta. Usá otro identificador por anuncio si querés compararlos.',
  },
  whatsapp_difusion: {
    title: 'Cómo hacer una difusión por WhatsApp',
    description: 'Compartí la tienda con varios contactos y medí la actividad que llega por ese enlace.',
    steps: [
      'Copiá el link WhatsApp difusión completo.',
      'En WhatsApp desde tu celular Android, entrá a Chats → menú de tres puntos → Nueva difusión. En otras versiones, buscá Listas de difusión.',
      'Elegí los contactos, confirmá y escribí un mensaje breve con el enlace completo.',
      'Para probar, enviáselo a dos personas conocidas y pediles que abran la tienda.',
    ],
    note: 'Para recibir una difusión, los contactos deben tener tu número guardado. Cada respuesta llega en privado. TiendaSmart no envía mensajes ni mide si los leyeron en WhatsApp.',
  },
};

const generatorGuide: Guide = {
  title: 'Cómo crear y probar un link de campaña',
  description: 'El cliente abre la misma tienda. Las etiquetas del enlace te ayudan a reconocer qué difusión, publicación o QR trajo actividad.',
  steps: [
    'Elegí dónde lo vas a compartir: Instagram, WhatsApp, un QR o un anuncio.',
    'Completá los campos del generador. Para una primera prueba, alcanza con un ts_link fácil de reconocer, como prueba_whatsapp.',
    'Tocá Copiar link y pegalo en el lugar donde lo vas a compartir. Conservá el enlace completo, incluido lo que aparece después del signo de pregunta.',
    'Pedile a alguien que lo abra o probalo en una ventana de incógnito. Entrá a un producto y agregalo al carrito; no hace falta crear un pedido.',
  ],
};

export default function CampaignLinkHelp({ tsLink }: { tsLink?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const guide = (tsLink && guides[tsLink]) || generatorGuide;

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={tsLink ? `Cómo utilizarlo: ${guide.title}` : 'Cómo se usa el generador de links'}
        onClick={() => dialog.current?.showModal()}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        Cómo utilizarlo
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/50"
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current?.close();
        }}
      >
        <div className="p-5 sm:p-6">
          <div className="mb-3 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-xl font-semibold">{guide.title}</h2>
            <button type="button" onClick={() => dialog.current?.close()} className="shrink-0 rounded-lg border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-emerald-700">Cerrar</button>
          </div>
          <p id={descriptionId} className="text-sm leading-6 text-slate-600">{guide.description}</p>
          <ol className="my-5 list-decimal space-y-3 pl-5 text-sm leading-6">
            {guide.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          {!tsLink && (
            <dl className="mb-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm leading-6">
              <div><dt className="font-semibold">Identificador del enlace (ts_link)</dt><dd>Qué pieza querés reconocer. Ejemplo: whatsapp_difusion.</dd></div>
              <div><dt className="font-semibold">Origen (utm_source)</dt><dd>Desde dónde lo compartís. Ejemplo: whatsapp o instagram.</dd></div>
              <div><dt className="font-semibold">Medio (utm_medium)</dt><dd>Cómo lo compartís. Ejemplo: message, social u offline.</dd></div>
              <div><dt className="font-semibold">Campaña (utm_campaign)</dt><dd>Nombre para agrupar una acción comercial. Ejemplo: regalos_noviembre.</dd></div>
            </dl>
          )}
          {guide.note && <p className="mb-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">{guide.note}</p>}
          <div className="rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
            <h3 className="font-semibold">Dónde ver el resultado</h3>
            <p>Volvé a Analytics, elegí Hoy y actualizá la página. En Rendimiento de enlaces identificados buscá {tsLink ? <strong>{tsLink}</strong> : 'el identificador que elegiste'}. Ahí podés revisar la actividad y los pedidos atribuidos a ese enlace.</p>
            <p className="mt-2">Se mide la actividad al abrir el enlace, no cuántas veces lo compartiste. Las etiquetas identifican el enlace usado; si lo reenvían por otro canal, conserva las mismas etiquetas.</p>
          </div>
        </div>
      </dialog>
    </>
  );
}
